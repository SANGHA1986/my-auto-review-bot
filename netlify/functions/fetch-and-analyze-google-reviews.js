// 파일 위치: netlify/functions/fetch-and-analyze-google-reviews.js

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
// ★★★ 중요: 실제 구글 지도 크롤링(웹 스크래핑)을 위해서는 'puppeteer-core' 같은 전문 라이브러리가 필요합니다.
// Netlify 환경에서 Puppeteer를 설정하는 것은 매우 복잡하므로, 여기서는 개념적인 흐름을 보여주는 '가상' 코드로 작성합니다.

exports.handler = async (event) => {
    // --- 1. 필요한 환경 변수 및 설정 불러오기 ---
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !serviceKey || !geminiApiKey) {
        return { statusCode: 500, body: JSON.stringify({ message: "서버 환경 변수가 부족합니다." }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    try {
        // --- 2. 구글 지도에서 리뷰 데이터 가져오기 (크롤링) ---
        // 실제로는 이 부분에 복잡한 웹 크롤링 코드가 들어갑니다.
        // 예를 들어, 사용자가 요청한 구글 지도 URL에서 리뷰 텍스트들을 추출합니다.
        console.log("구글 지도 리뷰 수집 시작...");
        const reviewsFromGoogle = await scrapeGoogleReviews(); // 가상 함수 호출
        console.log(`리뷰 ${reviewsFromGoogle.length}개 수집 완료.`);

        if (reviewsFromGoogle.length === 0) {
            return { statusCode: 200, body: JSON.stringify({ success: true, message: "새로운 리뷰가 없습니다." }) };
        }

        // --- 3. ★사장님의 기존 분석 로직 재활용★ ---
        console.log("Gemini AI로 리뷰 분석 시작...");
        // analyze-reviews.js의 핵심 프롬프트를 그대로 가져와 사용합니다.
        const prompt = `You are a very fast analyzer. Based on the reviews, count sentiments (positive, negative, neutral). Reviews: ${reviewsFromGoogle.join(', ')}. Respond in JSON: {"positive":0, "negative":0, "neutral":0}`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const analysisData = JSON.parse(responseText.match(/```json\s*([\s\S]*?)\s*```/)[1]);
        console.log("리뷰 분석 완료:", analysisData);

        // --- 4. 분석 결과를 Supabase 데이터베이스에 저장 ---
        console.log("분석 결과를 데이터베이스에 저장 시작...");
        const { data, error } = await supabase
            .from('daily_review_analysis') // 'daily_review_analysis'라는 테이블을 미리 만들어야 합니다.
            .insert([
                { 
                    analysis_date: new Date().toISOString().slice(0, 10), // 오늘 날짜
                    positive_count: analysisData.positive,
                    negative_count: analysisData.negative,
                    neutral_count: analysisData.neutral,
                    total_reviews: reviewsFromGoogle.length
                }
            ]);

        if (error) throw error;
        console.log("데이터베이스 저장 성공!");

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "리뷰 수집 및 분석, 저장이 완료되었습니다.", data: analysisData }),
        };

    } catch (error) {
        console.error("자동화 프로세스 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `서버 오류: ${error.message}` }),
        };
    }
};

// 가상 크롤링 함수 (개념 설명용)
async function scrapeGoogleReviews() {
    // 실제 구현 시, Puppeteer를 사용하여 특정 URL에 접속하고,
    // 스크롤을 내리며 리뷰 텍스트가 담긴 HTML 요소를 찾아 내용을 추출합니다.
    // 지금은 테스트를 위해 하드코딩된 리뷰 데이터를 반환합니다.
    return [
        "여기 음식 정말 맛있어요! 분위기도 최고!",
        "가격이 좀 비싸긴 한데 맛은 인정합니다.",
        "주차장이 너무 좁아서 불편했어요. 음식은 그냥 그래요.",
        "직원분이 너무 친절하셔서 기분 좋게 식사했습니다. 재방문 의사 100%",
        "음식이 너무 늦게 나와서 별로였습니다."
    ];
}