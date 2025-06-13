const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ★★★ 이 부분은 다른 파일에서 복사해 온, AI에게 질문하는 방식(프롬프트)에 대한 코드입니다. ★★★
const getPrompt = (reviews, requestMode) => {
    const reviewText = reviews.join("\n---\n");
    const commonInstructions = `
        You are an AI specialized in analyzing customer reviews for local businesses in Korean.
        Analyze the following reviews.
        Provide the response ONLY in JSON format, enclosed in a single markdown code block (\`\`\`json ... \`\`\`).
        Do not include any text outside the JSON block.
        The JSON root must have a "success": true field.
        The data for the analysis should be in a "data" object.
        The language of all text content in the JSON response (e.g., names, labels, summaries) must be Korean.
    `;
    const basePrompt = `
        ${commonInstructions}
        From the reviews, perform the following tasks:
        1. Count the total number of positive, negative, and neutral reviews.
        2. Extract up to the top 5 most frequent and meaningful keywords.
        3. Identify up to 5 main categories (e.g., 맛, 가격, 서비스, 분위기, 위생) and count their mentions.
        4. Identify up to 5 main topics (e.g., 메뉴 추천, 주차 문제, 대기 시간) and count their mentions.
        JSON structure: { "success": true, "data": { "totalReviewsAnalyzed": ${reviews.length}, "sentimentCounts": { "positive": 0, "negative": 0, "neutral": 0 }, "topKeywords": [ { "keyword": "키워드", "count": 0 } ], "categories": [ { "name": "카테고리명", "mentions": 0 } ], "topics": [ { "name": "토픽명", "mentions": 0 } ] } }
    `;
    const diagnosticDetailPrompt = `
        ${commonInstructions}
        From the reviews, perform the most in-depth analysis:
        1. For each category, provide a sentiment score (-1.0 to 1.0) and a short diagnostic comment.
        2. For each topic, describe the customer's experience and sentiment.
        3. Distribute reviews into detailed sentiment labels (e.g., 매우 긍정, 긍정, 중립, 부정, 매우 부정) and count them.
        4. Identify and count up to 3 main issues/problems.
        5. For up to 5 main keywords, calculate their sentiment score (-1.0 to 1.0).
        6. Summarize feedback related to delivery riders, if any.
        7. Extract up to 3 most representative positive and negative reviews.
        8. Generate a "AI 심층 분석 요약 및 구체적 실행 계획" and detailed "주요 개선 제안" with 'proposal' and 'expectedEffect'.
        JSON structure: { "success": true, "data": { "categories_diagnostic_detail": [ { "name": "카테고리명", "sentimentScore": 0.8, "diagnosticComment": "..." } ], "topics_diagnostic_detail": [ { "name": "토픽명", "topicSentimentAndExperience": "..." } ], "detailedSentiment": [ {"label": "매우 긍정", "count": 0}, ... ], "issues": [ { "name": "문제점명", "count": 0 } ], "keywordSentiments": [ { "keyword": "키워드", "score": 0.9 } ], "riderFeedbackSummary": "...", "representativePositiveReviews": [ "..." ], "representativeNegativeReviews": [ "..." ], "customSummary": "...", "recommendations": [ { "proposal": "...", "expectedEffect": "..." } ] } }
    `;
    if (requestMode === 'base') return `${basePrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
    if (requestMode === 'diagnosticDetail') return `${diagnosticDetailPrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
    return `${basePrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
};

// ★★★ 이 부분은 실제 구글 리뷰를 긁어오는 가짜(테스트용) 함수입니다. ★★★
async function scrapeGoogleReviews() {
    console.log("가상 크롤링 함수 실행: 테스트용 리뷰 5개를 반환합니다.");
    return [
        "여기 음식 정말 맛있어요! 분위기도 최고!",
        "가격이 좀 비싸긴 한데 맛은 인정합니다.",
        "주차장이 너무 좁아서 불편했어요. 음식은 그냥 그래요.",
        "직원분이 너무 친절하셔서 기분 좋게 식사했습니다. 재방문 의사 100%",
        "음식이 너무 늦게 나와서 별로였습니다."
    ];
}

// ★★★ 이 부분이 '자동 분석 일꾼'의 메인 로직입니다. ★★★
exports.handler = async (event) => {
    console.log("--- 매일 자동 분석 작업 시작 ---");

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !serviceKey || !geminiApiKey) {
        console.error("치명적 오류: 서버 환경 변수가 없습니다.");
        return { statusCode: 500, body: "환경 변수 설정 오류" };
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    try {
        const reviews = await scrapeGoogleReviews();
        if (!reviews || !reviews.length) {
            console.log("새로운 리뷰가 없어 작업을 종료합니다.");
            return { statusCode: 200, body: "No new reviews." };
        }
        console.log(`${reviews.length}개의 리뷰를 가져왔습니다.`);

        console.log("AI에게 기본 분석 요청 중...");
        const basePrompt = getPrompt(reviews, 'base');
        const baseResult = await model.generateContent(basePrompt);
        const baseJsonMatch = baseResult.response.text().match(/```json\s*([\s\S]*?)\s*```/);
        if (!baseJsonMatch || !baseJsonMatch[1]) throw new Error("기본 분석 결과에서 JSON을 추출하지 못했습니다.");
        const baseData = JSON.parse(baseJsonMatch[1]).data;
        console.log("기본 분석 완료.");

        console.log("AI에게 상세 분석 요청 중...");
        const detailPrompt = getPrompt(reviews, 'diagnosticDetail');
        const detailResult = await model.generateContent(detailPrompt);
        const detailJsonMatch = detailResult.response.text().match(/```json\s*([\s\S]*?)\s*```/);
        if (!detailJsonMatch || !detailJsonMatch[1]) throw new Error("상세 분석 결과에서 JSON을 추출하지 못했습니다.");
        const detailData = JSON.parse(detailJsonMatch[1]).data;
        console.log("상세 분석 완료.");
        
        const finalAnalysisData = { ...baseData, ...detailData };
        console.log("분석 데이터 병합 완료.");

        const today = new Date().toISOString().slice(0, 10);
        console.log(`${today} 날짜의 분석 결과를 DB에 저장 시도...`);
        
        const { data, error } = await supabase
            .from('review_analysis_results')
            .insert([{
                store_id: 'my-first-store',
                analysis_date: today,
                analysis_data: finalAnalysisData,
                total_reviews: finalAnalysisData.totalReviewsAnalyzed || reviews.length,
                positive_count: finalAnalysisData.sentimentCounts.positive,
                negative_count: finalAnalysisData.sentimentCounts.negative,
                neutral_count: finalAnalysisData.sentimentCounts.neutral || 0
            }]);

        if (error) {
            console.error("DB 저장 오류:", error);
            throw error;
        }

        console.log(`성공! DB에 새로운 분석 결과를 저장했습니다.`);
        return { statusCode: 200, body: "Analysis complete and saved." };

    } catch (error) {
        console.error("자동 분석 작업 중 심각한 오류 발생:", error.message);
        return { statusCode: 500, body: error.toString() };
    }
};