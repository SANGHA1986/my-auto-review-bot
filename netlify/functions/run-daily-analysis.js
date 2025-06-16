const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Resend } = require('resend'); // 이메일 도구 불러오기

/**
 * AI에게 보낼 통합되고 상세한 명령서(프롬프트)를 생성하는 함수.
 */
const getPrompt = (reviews) => {
    const reviewText = reviews.join("\n---\n");
    const comprehensivePrompt = `
        You are a world-class business analyst AI specializing in analyzing customer reviews for Korean restaurants.
        Your analysis must be extremely detailed, insightful, and actionable for the business owner.
        Provide the response ONLY in JSON format, enclosed in a single markdown code block (\`\`\`json ... \`\`\`).
        Do not include any text outside the JSON block.
        The JSON root must have a "success": true field.
        The analysis data must be in a "data" object.
        All text content in the JSON response (summaries, labels, keywords, etc.) must be in Korean.

        Analyze the following reviews and perform a comprehensive analysis covering all aspects below.

        **Required JSON Output Structure:**
        {
          "success": true,
          "data": {
            "totalReviewsAnalyzed": ${reviews.length},
            "executiveSummary": "AI가 분석한 비즈니스 관점의 종합 요약. 강점, 약점, 기회, 위협(SWOT)을 포함하여 작성.",
            "detailedSentiment": [
              {"label": "매우 긍정", "count": 0}, {"label": "긍정", "count": 0}, {"label": "중립", "count": 0}, {"label": "부정", "count": 0}, {"label": "매우 부정", "count": 0}
            ],
            "topKeywords": [ { "keyword": "키워드", "count": 0, "sentimentScore": 0.8 } ],
            "categories": [ { "name": "맛", "mentions": 0, "sentimentScore": 0.9, "positiveAspects": ["바삭함"], "negativeAspects": ["느끼함"] } ],
            "actionableRecommendations": [ { "proposal": "개선 제안", "expectedEffect": "기대 효과", "basis": "데이터 근거" } ],
            "representativePositiveReviews": ["대표 긍정 리뷰 1"],
            "representativeNegativeReviews": ["대표 부정 리뷰 1"]
          }
        }
    `;
    return `${comprehensivePrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
};

/**
 * 실제 구글 리뷰를 긁어오는 가짜(테스트용) 함수입니다.
 */
async function scrapeGoogleReviews() {
    console.log("가상 크롤링 함수 실행: 테스트용 리뷰 5개를 반환합니다.");
    return [
        "여기 음식 정말 맛있어요! 분위기도 최고!", "가격이 좀 비싸긴 한데 맛은 인정합니다.", "주차장이 너무 좁아서 불편했어요. 음식은 그냥 그래요.",
        "직원분이 너무 친절하셔서 기분 좋게 식사했습니다. 재방문 의사 100%", "음식이 너무 늦게 나와서 별로였습니다."
    ];
}

/**
 * 분석 결과를 예쁜 이메일로 만들어 보내는 함수
 */
async function sendEmailReport(analysisData) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const today = new Date().toISOString().slice(0, 10);

    let emailHtml = `
        <h1>📈 ${today} 리뷰 분석 리포트</h1>
        <h2>AI 심층 분석 요약</h2>
        <p>${analysisData.executiveSummary || '요약 정보 없음'}</p>
        <hr>
        <h2>데이터 기반 실행 계획</h2>
        <ul>`;
    analysisData.actionableRecommendations?.forEach(rec => {
        emailHtml += `<li><strong>${rec.proposal}</strong><br><small>근거: ${rec.basis}</small></li>`;
    });
    emailHtml += `</ul><hr><h2>대표 긍정/부정 리뷰</h2>`;
    emailHtml += `<h3>👍 긍정 리뷰</h3><p><i>"${analysisData.representativePositiveReviews?.join('"<br>"')}"</i></p>`;
    emailHtml += `<h3>👎 부정 리뷰</h3><p><i>"${analysisData.representativeNegativeReviews?.join('"<br>"')}"</i></p>`;

    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev', // ★★★ Resend에 등록한 도메인 이메일 주소로 변경하세요! ★★★
            to: 'scimiter2010@gmail.com',   // ★★★ 파트너님께서 리포트 받으실 이메일 주소로 변경하세요! ★★★
            subject: `[자동 분석 리포트] ${today}자 리뷰 분석 결과입니다.`,
            html: emailHtml,
        });
        console.log('성공: 분석 리포트 이메일을 성공적으로 발송했습니다.');
    } catch (error) {
        console.error('오류: 이메일 발송에 실패했습니다.', error);
    }
}


/**
 * '자동 분석 일꾼'의 메인 로직
 */
exports.handler = async (event) => {
    console.log("--- 매일 자동 분석 및 이메일 발송 작업 시작 ---");

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceKey || !geminiApiKey || !resendApiKey) {
        console.error("치명적 오류: 서버 환경 변수가 한 개 이상 누락되었습니다.");
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

        console.log("AI에게 종합 분석 요청 중...");
        const comprehensivePrompt = getPrompt(reviews);
        const result = await model.generateContent(comprehensivePrompt);
        const jsonMatch = result.response.text().match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch || !jsonMatch[1]) throw new Error("종합 분석 결과에서 JSON을 추출하지 못했습니다.");
        const analysisData = JSON.parse(jsonMatch[1]).data;
        console.log("종합 분석 완료.");

        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        if (analysisData.detailedSentiment) {
            for (const sentiment of analysisData.detailedSentiment) {
                if (sentiment.label.includes('긍정')) { sentimentCounts.positive += sentiment.count; } 
                else if (sentiment.label.includes('부정')) { sentimentCounts.negative += sentiment.count; } 
                else { sentimentCounts.neutral += sentiment.count; }
            }
        }
        
        const today = new Date().toISOString().slice(0, 10);
        console.log(`${today} 날짜의 분석 결과를 DB에 저장 시도...`);
        
        await supabase.from('review_analysis_results').insert([{
            store_id: 'my-first-store',
            analysis_date: today,
            analysis_data: analysisData,
            total_reviews: analysisData.totalReviewsAnalyzed || reviews.length,
            positive_count: sentimentCounts.positive,
            negative_count: sentimentCounts.negative,
            neutral_count: sentimentCounts.neutral
        }]);
        console.log(`성공! DB에 새로운 분석 결과를 저장했습니다.`);

        // 분석이 모두 끝난 후, 이메일을 보냅니다.
        await sendEmailReport(analysisData);

        return { statusCode: 200, body: "Analysis and email sending complete." };

    } catch (error) {
        console.error("자동 분석 작업 중 심각한 오류 발생:", error.message);
        return { statusCode: 500, body: error.toString() };
    }
};