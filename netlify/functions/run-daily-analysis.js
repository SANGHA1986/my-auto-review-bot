const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * [개선] AI에게 보낼 통합되고 상세한 명령서(프롬프트)를 생성하는 함수.
 * 이제 requestMode 없이, 항상 가장 효율적인 종합 분석을 요청합니다.
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
              {"label": "매우 긍정", "count": 0},
              {"label": "긍정", "count": 0},
              {"label": "중립", "count": 0},
              {"label": "부정", "count": 0},
              {"label": "매우 부정", "count": 0}
            ],
            "topKeywords": [
              { "keyword": "키워드", "count": 0, "sentimentScore": 0.8 }
            ],
            "categories": [
              { "name": "맛", "mentions": 0, "sentimentScore": 0.9, "positiveAspects": ["바삭함"], "negativeAspects": ["느끼함"] }
            ],
            "actionableRecommendations": [
              {
                "proposal": "피크 타임(18-20시) 주문 시, 예상 배달 시간을 10분 추가하여 안내하기",
                "expectedEffect": "배달 시간 관련 부정적 경험을 줄여 고객 만족도 향상",
                "basis": "'배달 지연' 문제가 5회 이상 언급됨에 따라, 기대치 관리가 필요함."
              }
            ],
            "representativePositiveReviews": ["가장 대표적인 긍정 리뷰 원문 1"],
            "representativeNegativeReviews": ["가장 대표적인 부정 리뷰 원문 1"]
          }
        }
    `;

    return `${comprehensivePrompt}\n\n---START OF REVIEWS---\n${reviewText}\n---END OF REVIEWS---`;
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
    console.log("--- 매일 자동 분석 작업 시작 (효율화 버전) ---");

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

        // [개선] AI에게 단 한 번만 종합 분석을 요청합니다.
        console.log("AI에게 종합 분석 요청 중...");
        const comprehensivePrompt = getPrompt(reviews);
        const result = await model.generateContent(comprehensivePrompt);
        const jsonMatch = result.response.text().match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch || !jsonMatch[1]) throw new Error("종합 분석 결과에서 JSON을 추출하지 못했습니다.");
        
        const analysisData = JSON.parse(jsonMatch[1]).data;
        console.log("종합 분석 완료.");

        // DB 저장을 위해 상세 감성 데이터에서 단순 긍정/부정/중립 카운트를 계산합니다.
        const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
        if (analysisData.detailedSentiment) {
            for (const sentiment of analysisData.detailedSentiment) {
                if (sentiment.label.includes('긍정')) {
                    sentimentCounts.positive += sentiment.count;
                } else if (sentiment.label.includes('부정')) {
                    sentimentCounts.negative += sentiment.count;
                } else {
                    sentimentCounts.neutral += sentiment.count;
                }
            }
        }
        
        const today = new Date().toISOString().slice(0, 10);
        console.log(`${today} 날짜의 분석 결과를 DB에 저장 시도...`);
        
        const { data, error } = await supabase
            .from('review_analysis_results')
            .insert([{
                store_id: 'my-first-store',
                analysis_date: today,
                analysis_data: analysisData, // AI가 생성한 상세 데이터 전체를 저장
                total_reviews: analysisData.totalReviewsAnalyzed || reviews.length,
                positive_count: sentimentCounts.positive, // 계산된 값 사용
                negative_count: sentimentCounts.negative, // 계산된 값 사용
                neutral_count: sentimentCounts.neutral    // 계산된 값 사용
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