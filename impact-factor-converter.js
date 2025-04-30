#!/usr/bin/env node

/**
 * Impact Factor PDF 변환 유틸리티
 * 
 * PDF 형식의 저널 Impact Factor 데이터를 JSON 형식으로 변환합니다.
 * 
 * 사용법:
 * node impact-factor-converter.js <input.pdf> <output.json> [options]
 * 
 * 옵션:
 * --debug    디버그 메시지 출력
 * --help     도움말 표시
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');

// 명령행 인수 파싱
const args = process.argv.slice(2);
const options = {
  debug: args.includes('--debug'),
  help: args.includes('--help')
};

// 도움말 표시
if (options.help || args.length < 2) {
  console.log(`
Impact Factor 변환 유틸리티

PDF 형식의 저널 Impact Factor 데이터를 JSON 형식으로 변환합니다.

사용법:
  node impact-factor-converter.js <input.pdf> <output.json> [options]

옵션:
  --debug    디버그 메시지 출력
  --help     이 도움말 표시

예시:
  node impact-factor-converter.js impact-factors-2024.pdf impact_factor_data.json
  `);
  process.exit(0);
}

// 입출력 파일 경로
const inputFile = args[0];
const outputFile = args[1];

// PDF 파일에서 텍스트 추출 및 JSON으로 변환
async function convertPdfToJson(pdfPath) {
  try {
    // PDF 파일 로드
    console.log(`PDF 파일 로드 중: ${pdfPath}`);
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // PDF 페이지 수 확인
    const pageCount = pdfDoc.getPageCount();
    console.log(`총 ${pageCount}페이지 처리 시작`);
    
    // 데이터 저장 객체
    const impactFactorData = {};
    
    // 텍스트 추출 및 처리
    for (let i = 0; i < pageCount; i++) {
      if (options.debug || (i % 10 === 0)) {
        console.log(`페이지 ${i + 1}/${pageCount} 처리 중...`);
      }
      
      // 각 페이지에서 텍스트 추출
      const page = pdfDoc.getPage(i);
      const textContent = await extractTextFromPage(page);
      
      // Impact Factor 데이터 파싱
      parseImpactFactorData(textContent, impactFactorData);
    }
    
    return impactFactorData;
  } catch (error) {
    console.error('PDF 변환 오류:', error);
    throw error;
  }
}

// PDF 페이지에서 텍스트 추출
async function extractTextFromPage(page) {
  // PDF-lib은 텍스트 추출 기능이 제한적이므로, 실제 구현에서는
  // pdf.js 또는 다른 PDF 텍스트 추출 라이브러리를 사용해야 합니다.
  // 여기서는 간단한 예시만 제공합니다.
  
  // 참고: 실제 구현에서는 아래 코드 대신 pdf.js 또는 다른 PDF 파서 사용 필요
  console.warn('경고: 이 예시 코드는 실제 PDF 텍스트를 추출하지 않습니다.');
  console.warn('실제 구현에서는 pdf.js 또는 다른 PDF 파서를 사용하세요.');
  
  // 예시 텍스트 반환 (실제로는 PDF에서 추출해야 함)
  return `Journal Name Impact Factor
Nature 49.962
Science 47.728
The New England Journal of Medicine 91.245
Cell 38.637
The Lancet 79.321
JAMA 56.272
BMJ (British Medical Journal) 39.890
Nature Medicine 53.440
Nature Reviews Cancer 66.752
Nature Genetics 36.377`;
}

// 텍스트에서 Impact Factor 데이터 파싱
function parseImpactFactorData(text, data) {
  // 줄 단위로 텍스트 분할
  const lines = text.split('\n');
  
  // Impact Factor 패턴 (저널명 + 숫자) 찾기
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+([\d.]+)$/);
    if (match) {
      const journalName = match[1].trim().toLowerCase();
      const impactFactor = parseFloat(match[2]);
      
      if (journalName && !isNaN(impactFactor)) {
        data[journalName] = impactFactor;
        
        // 별칭 추가 (약어 및 확장된 이름)
        addJournalAliases(journalName, impactFactor, data);
        
        if (options.debug) {
          console.log(`저널 발견: ${journalName} (IF: ${impactFactor})`);
        }
      }
    }
  }
}

// 저널 별칭 추가 (약어와 긴 이름)
function addJournalAliases(journalName, impactFactor, data) {
  // 일반적인 저널 약어와 확장 이름 매핑
  const commonAbbreviations = {
    // 일반적인 약어 => 전체 이름
    'nejm': 'new england journal of medicine',
    'n engl j med': 'new england journal of medicine',
    'jama': 'journal of the american medical association',
    'bmj': 'british medical journal',
    'lancet': 'the lancet',
    
    // 전체 이름 => 약어
    'new england journal of medicine': 'nejm',
    'journal of the american medical association': 'jama',
    'british medical journal': 'bmj',
    'the lancet': 'lancet'
  };
  
  // 일반적인 접두사/접미사 제거된 버전 추가
  let simplifiedName = journalName
    .replace(/^the\s+/i, '')
    .replace(/\s+journal$/i, '')
    .trim();
  
  if (simplifiedName !== journalName) {
    data[simplifiedName] = impactFactor;
  }
  
  // 약어나 확장 이름 추가
  if (commonAbbreviations[journalName]) {
    data[commonAbbreviations[journalName]] = impactFactor;
  }
}

// 메인 함수
async function main() {
  try {
    console.log('Impact Factor 변환 유틸리티 시작');
    
    // 입력 파일 확인
    if (!fs.existsSync(inputFile)) {
      console.error(`오류: 입력 파일이 존재하지 않습니다: ${inputFile}`);
      process.exit(1);
    }
    
    // 출력 디렉토리 확인 및 생성
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`출력 디렉토리 생성됨: ${outputDir}`);
    }
    
    // PDF를 JSON으로 변환
    console.log(`${inputFile} 파일 변환 중...`);
    const impactFactorData = await convertPdfToJson(inputFile);
    
    // 결과 저장
    const journalCount = Object.keys(impactFactorData).length;
    console.log(`${journalCount}개 저널의 Impact Factor 정보를 추출했습니다.`);
    
    fs.writeFileSync(outputFile, JSON.stringify(impactFactorData, null, 2));
    console.log(`결과가 ${outputFile}에 저장되었습니다.`);
  } catch (error) {
    console.error('변환 오류:', error);
    process.exit(1);
  }
}

// 프로그램 실행
main();