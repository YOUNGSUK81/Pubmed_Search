# PubMed Search MCP Server

Model Context Protocol(MCP) 서버로, 의학 주제에 관한 질문을 분석하여 PubMed에서 관련 논문을 검색하고 연관성 및 저널 Impact Factor에 따라 결과를 EndNote 형식으로 제공합니다.

## 주요 기능

- **검색 쿼리 분석**: 의학 관련 질문을 분석하여, PubMed API를 통해 의학 논문 검색
- **연관성 분석**: 논문의 제목, 초록, MeSH 용어 등을 분석하여 질문과 가장 관련성 높은 논문 선별
- **Impact Factor 기반 정렬**: 저널의 Impact Factor에 따라 논문을 정렬하여 영향력 높은 연구 제공
- **EndNote 형식 출력**: 선별된 논문을 EndNote 호환 포맷으로 출력하여 문헌 관리 용이
- **결과 분류**: 세 가지 파일로 결과 제공
  - 연관성이 높은 논문 목록
  - Impact Factor가 높은 논문 목록
  - Impact Factor 데이터베이스에 없는 저널의 논문 목록

## 도구 설명

- **pubmed_search**: PubMed에서 의학 논문 검색 및 분석
  - 입력:
    - `query` (string, 필수): 의학 관련 질문 또는 검색 쿼리
    - `maxResults` (number, 선택, 기본값: 10): 반환할 최대 결과 수
    - `outputDir` (string, 선택, 기본값: "./output"): 결과 파일을 저장할 디렉터리 경로

- **load_impact_factor**: Impact Factor 데이터 파일 로드
  - 입력:
    - `filePath` (string, 필수): Impact Factor 데이터 파일 경로

## 설치 및 설정

### 필수 조건

- Node.js 16 이상
- NCBI API 키 (무료로 발급 가능: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/)
- Impact Factor 데이터 JSON 파일

### Impact Factor 데이터 변환

PDF 형식의 Impact Factor 데이터를 JSON으로 변환:

```bash
# 변환 스크립트 실행
node impact-factor-converter.js impact-factor.pdf impact_factor_data.json
```

### 설치

```bash
# 저장소 클론
git clone https://github.com/YOUNGSUK81/Pubmed_Search.git
cd Pubmed_Search

# 의존성 설치
npm install

# 빌드
npm run build
```

### 환경 변수 설정

```bash
# NCBI API 키 설정
export NCBI_API_KEY=your_api_key_here

# Impact Factor 데이터 경로 설정(선택 사항)
export IMPACT_FACTOR_PATH=./path/to/impact_factor_data.json

# 출력 디렉터리 설정(선택 사항)
export OUTPUT_DIR=./output
```

## 사용 방법

### Claude Desktop과 함께 사용

Claude Desktop 설정 파일(`claude_desktop_config.json`)에 다음을 추가:

```json
{
  "mcpServers": {
    "pubmed-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-pubmed-search"],
      "env": {
        "NCBI_API_KEY": "9585a3fc07ce86e32a3f42169e2c571a5708",
        "IMPACT_FACTOR_PATH": "./impact_factor_data.json",
        "OUTPUT_DIR": "./output"
      }
    }
  }
}
```

### Docker 사용

```json
{
  "mcpServers": {
    "pubmed-search": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "NCBI_API_KEY=9585a3fc07ce86e32a3f42169e2c571a5708",
        "-v",
        "/path/to/impact_factor_data.json:/data/impact_factor_data.json",
        "-v",
        "/path/to/output:/data/output",
        "mcp/pubmed-search"
      ]
    }
  }
}
```

### VS Code와 함께 사용

VS Code 설정 파일(`.vscode/settings.json` 또는 User Settings)에 다음 추가:

```json
{
  "mcp": {
    "servers": {
      "pubmed-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-pubmed-search"],
        "env": {
          "NCBI_API_KEY": "9585a3fc07ce86e32a3f42169e2c571a5708",
          "IMPACT_FACTOR_PATH": "./impact_factor_data.json",
          "OUTPUT_DIR": "./output"
        }
      }
    }
  }
}
```

## 도커 빌드

직접 도커 이미지를 빌드하려면:

```bash
docker build -t mcp/pubmed-search .
```

## 디렉토리 구조

```
pubmed-search-mcp-server/
├── package.json                   # 프로젝트 의존성 정보
├── tsconfig.json                  # TypeScript 설정
├── Dockerfile                     # Docker 빌드 설정
├── README.md                      # 프로젝트 문서
├── impact-factor-converter.js     # PDF → JSON 변환 스크립트
├── impact_factor_data.json        # Impact Factor 데이터 (생성됨)
├── src/
│   ├── index.ts                   # 메인 서버 파일
│   └── pubmed-service.ts          # PubMed API 및 분석 서비스
└── output/                        # 결과 출력 디렉터리 (생성됨)
    ├── relevance-results.txt      # 연관성 높은 논문 결과
    ├── impact-factor-results.txt  # Impact Factor 높은 논문 결과
    └── unknown-impact-factor.txt  # Impact Factor 미상 논문 목록
```

## 개발 가이드

프로젝트 확장 시 고려할 사항:

1. **pubmed-service.ts**: PubMed API 요청 및 결과 처리 로직이 포함된 핵심 모듈
2. **index.ts**: MCP 서버 초기화 및 도구 정의, 요청 처리 모듈
3. **impact-factor-converter.js**: Impact Factor 데이터 변환 스크립트 (PDF → JSON)

### 새 기능 추가하기

새로운 기능이나 도구를 추가하려면:

1. `pubmed-service.ts`에 필요한 함수 구현
2. `index.ts`의 `ListToolsRequestSchema` 핸들러에 도구 정의 추가
3. `CallToolRequestSchema` 핸들러에 도구 처리 로직 추가

## 라이센스

MIT 라이센스에 따라 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.