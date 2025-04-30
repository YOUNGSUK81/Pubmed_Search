#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import fs from "fs/promises";
import { 
  searchPubMed, 
  fetchArticleDetails, 
  analyzeRelevance,
  loadImpactFactorData, 
  generateResults,
  saveResultsToFiles
} from "./pubmed-service.js";

// NCBI API 키 설정
const NCBI_API_KEY = process.env.NCBI_API_KEY || "9585a3fc07ce86e32a3f42169e2c571a5708";

// Impact Factor 데이터 경로
const IMPACT_FACTOR_PATH = process.env.IMPACT_FACTOR_PATH || "./impact_factor_data.json";

// 출력 디렉터리
const OUTPUT_DIR = process.env.OUTPUT_DIR || "./output";

// 전역 Impact Factor 데이터
let impactFactorData = {};

// 서버 설정
const server = new Server(
  {
    name: "pubmed-search-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 정의
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "pubmed_search",
        description: "의학 주제에 대한 질문을 분석하여 관련 논문을 PubMed에서 검색하고, Impact Factor를 기준으로 정렬된 결과를 제공합니다.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "의학 관련 질문 또는 검색 쿼리",
            },
            maxResults: {
              type: "number",
              description: "반환할 최대 결과 수 (기본값: 10)",
              default: 10,
            },
            outputDir: {
              type: "string",
              description: "결과 파일을 저장할 디렉터리 경로 (기본값: './output')",
              default: "./output",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "load_impact_factor",
        description: "Impact Factor 데이터 파일을 로드합니다.",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "Impact Factor 데이터 파일 경로",
            },
          },
          required: ["filePath"],
        },
      },
    ],
  };
});

// 검색 실행 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "pubmed_search": {
        const { query, maxResults = 10, outputDir = OUTPUT_DIR } = args;
        console.log(`PubMed 검색 실행: "${query}"`);

        // 1. PubMed 검색 실행
        const pmids = await searchPubMed(query, NCBI_API_KEY);
        console.log(`검색된 PMID 수: ${pmids.length}`);

        if (pmids.length === 0) {
          return {
            content: [{ type: "text", text: "검색 결과가 없습니다. 검색어를 변경해 보세요." }],
          };
        }

        // 2. 논문 상세 정보 가져오기 (최대 50개)
        const limitedPmids = pmids.slice(0, 50);
        const articles = await fetchArticleDetails(limitedPmids, NCBI_API_KEY);
        console.log(`논문 상세 정보를 가져온 수: ${articles.length}`);

        // 3. 연관성 분석
        const relevantArticles = analyzeRelevance(articles, query);
        console.log(`연관성 분석 완료`);

        // 4. Impact Factor 데이터 확인 및 결과 생성
        if (Object.keys(impactFactorData).length === 0) {
          console.log('Impact Factor 데이터가 로드되지 않았습니다. 기본 파일 로드 시도...');
          try {
            impactFactorData = await loadImpactFactorData(IMPACT_FACTOR_PATH);
          } catch (error) {
            console.warn(`기본 Impact Factor 데이터 로드 실패: ${error}`);
          }
        }

        // 5. 결과 생성
        const results = generateResults(relevantArticles, impactFactorData, maxResults);
        
        // 6. 결과 파일 저장
        await saveResultsToFiles(results, outputDir);

        // 7. 응답 반환
        const topRelevant = relevantArticles.slice(0, maxResults);
        const resultSummary = {
          totalResults: pmids.length,
          processedResults: articles.length,
          relevantResults: topRelevant.length,
          outputDirectory: outputDir,
          outputFiles: [
            `${outputDir}/relevance-results.txt`,
            `${outputDir}/impact-factor-results.txt`,
            `${outputDir}/unknown-impact-factor.txt`
          ]
        };

        return {
          content: [{ 
            type: "text", 
            text: `검색 완료. 결과는 다음 위치에 저장되었습니다:\n\n` +
                  `연관성 상위 논문: ${outputDir}/relevance-results.txt\n` +
                  `Impact Factor 상위 논문: ${outputDir}/impact-factor-results.txt\n` +
                  `Impact Factor 미상 논문: ${outputDir}/unknown-impact-factor.txt\n\n` +
                  `요약 정보: ${JSON.stringify(resultSummary, null, 2)}`
          }],
        };
      }

      case "load_impact_factor": {
        const { filePath } = args;
        console.log(`Impact Factor 데이터 로드: ${filePath}`);

        try {
          impactFactorData = await loadImpactFactorData(filePath);
          const journalCount = Object.keys(impactFactorData).length;
          
          return {
            content: [{ 
              type: "text", 
              text: `Impact Factor 데이터 로드 완료. ${journalCount}개 저널 정보가 로드되었습니다.` 
            }],
          };
        } catch (error) {
          return {
            content: [{ 
              type: "text", 
              text: `Impact Factor 데이터 로드 실패: ${error}` 
            }],
            isError: true,
          };
        }
      }
      
      default:
        return {
          content: [{ type: "text", text: `알 수 없는 도구: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `오류 발생: ${errorMessage}` }],
      isError: true,
    };
  }
});

// 서버 시작
async function runServer() {
  try {
    // Impact Factor 데이터 로드 시도
    try {
      impactFactorData = await loadImpactFactorData(IMPACT_FACTOR_PATH);
      console.log(`Impact Factor 데이터 로드 완료: ${Object.keys(impactFactorData).length}개 저널`);
    } catch (error) {
      console.warn(`Impact Factor 데이터 로드 실패: ${error}`);
      console.warn('서버는 실행되지만 Impact Factor 정보 없이 작동합니다.');
    }
    
    // 출력 디렉터리 생성 시도
    try {
      await fs.access(OUTPUT_DIR);
    } catch {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      console.log(`출력 디렉터리 생성됨: ${OUTPUT_DIR}`);
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("PubMed Search MCP 서버 실행 중");
  } catch (error) {
    console.error(`서버 시작 오류: ${error}`);
    process.exit(1);
  }
}

// 서버 실행
runServer().catch((error) => {
  console.error(`치명적 오류: ${error}`);
  process.exit(1);
});

// 종료 처리
process.on('SIGINT', async () => {
  console.log('서버 종료 중...');
  await server.close();
  process.exit(0);
});