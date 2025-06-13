// 파일 경로: /netlify/functions/analyze-store-reviews.js
// 이 코드 전체를 복사해서 새로 만든 파일에 그대로 붙여넣으세요.
// ★★★ 아무것도 수정할 필요 없습니다 ★★★

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. 기본 설정 (환경 변수에서 키 가져오기) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });


// --- 2. 자동 분석할 가게 정보와 "가짜 리뷰" 데이터 ---
const STORE_ID = "my-first-store";
const REVIEWS_TO_ANALYZE = [
    "여기 치킨 정말 바삭하고 맛있어요! 인생 치킨입니다. 강추!",
    "배달이 너무 늦게 왔고 음식이 다 식어서 완전 실망했어요.",
    "사장님이 정말 친절하시고, 요청사항도 잘 들어주셨습니다. 재주문 의사 100%!",
    "가격에 비해 양이 좀 적은 것 같아요. 맛은 그냥 평범합니다.",
    "포장을 꼼꼼하게 해주셔서 하나도 안 새고 따뜻하게 잘 왔습니다. 감사합니다."
];


// --- 3. AI에게 보낼 명령서(프롬프트) 만들기 ---
const getPrompt = (reviews, reviewCount) => {
    const reviewText = reviews.join('\n---\n');
    const baseStructure = `"totalReviewsAnalyzed": ${reviewCount},"sentimentCounts": {"positive": 0, "negative": 0, "neutral": 0},"topKeywords": [{"keyword": "키워드", "count": 0}],"categories": [{"name": "맛", "mentions": 0}, {"name": "서비스", "mentions": 0}, {"name": "가격", "mentions": 0}, {"name": "배달", "mentions": 0}, {"name": "양", "mentions": 0}],"topics": [{"name": "메뉴 추천", "mentions": 0}, {"name": "재주문 의사", "mentions": 0}, {"name": "포장 상태", "mentions": 0}, {"name": "고객 응대", "mentions":0}]`;
    const diagnosticDetailStructure = `"customSummary": "가장 심층적인 종합 진단. 데이터에 기반한 현재 상황(강점, 약점), 핵심 문제 원인, 그리고 즉시 실행 가능한 구체적 개선 계획(액션 아이템)을 제시.","recommendations": [{"proposal": "실행 가능한 구체적 개선안 1 (예: '매운맛 옵션 단계 세분화')", "expectedEffect": "예상되는 긍정적 효과 1 (예: '다양한 고객 취향 만족도 증가')"}],"categories_diagnostic_detail": [{"name": "맛", "sentimentScore": 0.8, "diagnosticComment": "맛에 대한 구체적인 진단 코멘트 (예: '단맛이 강하다는 의견과 감칠맛이 좋다는 의견이 공존함')"}],"topics_diagnostic_detail": [{"name": "포장 상태", "topicSentimentAndExperience": "포장 관련 긍정/부정 경험 및 감성 요약 (예: '보온은 잘 되나, 소스가 샌다는 불만 다수')"}],"detailedSentiment": [{"label": "매우 만족", "count": 0}, {"label": "만족", "count": 0}, {"label": "보통", "count": 0}, {"label": "불만", "count": 0}, {"label": "매우 불만", "count": 0}],"issues": [{"name": "음식 식음", "count": 0}, {"name": "주문 누락", "count": 0}, {"name": "소스 부족", "count": 0}],"keywordSentiments": [{"keyword": "치킨", "score": 0.9}, {"keyword": "느끼함", "score": -0.7}],"riderFeedbackSummary": "배달 라이더 관련 피드백 요약(없으면 '배달 관련 직접 언급된 피드백 없음'으로 명시)","representativePositiveReviews": ["가장 대표적인 긍정 리뷰 원문 1"],"representativeNegativeReviews": ["가장 대표적인 부정 리뷰 원문 1"]`;

    return `You are an extremely precise Korean review analysis AI. Your ONLY task is to analyze the following reviews and output a single JSON object. Follow these rules strictly: 1. Your response MUST start with \`\`\`json and end with \`\`\`. 2. Your response MUST NOT contain any text or explanation outside the JSON block. 3. The JSON structure MUST EXACTLY match the 'Required JSON format' below. 4. If there is no data for a field, you MUST include the field with a default value (0, an empty string "", or an empty array []). DO NOT omit any fields.
Reviews to analyze:
---
${reviewText}
---
Required JSON format:
\`\`\`json
{
${baseStructure},
${diagnosticDetailStructure}
}
\`\`\``;
};


// --- 4. 예약된 시간에 Netlify가 실행할 메인 로직 ---
exports.handler = async (event, context) => {
    console.log(`[${STORE_ID}] 자동 리뷰 분석을 시작합니다.`);

    try {
        const prompt = getPrompt(REVIEWS_TO_ANALYZE, REVIEWS_TO_ANALYZE.length);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch || !jsonMatch[1]) {
            throw new Error("AI 응답에서 유효한 JSON을 찾지 못했습니다.");
        }
        const analysisData = JSON.parse(jsonMatch[1]);
        console.log(`[${STORE_ID}] AI 분석 완료.`);

        const { data, error } = await supabase
            .from('review_analysis_results') // 이 테이블 이름은 파트너님 스크린샷 기준으로 넣었으니 맞을겁니다.
            .insert([
                { 
                    store_id: STORE_ID,
                    analysis_data: analysisData,
                    total_reviews: analysisData.totalReviewsAnalyzed,
                    positive_count: analysisData.sentimentCounts.positive,
                    negative_count: analysisData.sentimentCounts.negative,
                    neutral_count: analysisData.sentimentCounts.neutral,
                }
            ])
            .select();

        if (error) {
            console.error('Supabase 저장 오류:', error);
            throw new Error(`Supabase 저장 실패: ${error.message}`);
        }

        console.log(`[${STORE_ID}] 분석 결과를 Supabase에 성공적으로 저장했습니다.`, data);
        
        return {
            statusCode: 200,
            body: `[${STORE_ID}] 자동 분석 및 저장이 완료되었습니다.`,
        };

    } catch (error) {
        console.error('[자동 분석 실패]', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message }),
        };
    }
};