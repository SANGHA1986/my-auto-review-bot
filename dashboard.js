import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

document.addEventListener('DOMContentLoaded', function() {
    console.log("대시보드 스크립트 실행 시작! (v1.0)");

 const SUPABASE_URL = 'https://seggcwvzlentceqxedjw.supabase.co'; // ★★★ 나중에 실제 값으로 교체
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlZ2djd3Z6bGVudGNlcXhlZGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MTM0NTcsImV4cCI6MjA2NDQ4OTQ1N30.pYn3-UotVnUVNLZS1XWhDaM1ZcGE0YiBkOPPIt7rLx8'; // ★★★ 나중에 실제 값으로 교체
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- HTML 요소 선언 ---
    const refreshButton = document.getElementById('refresh-button');
    const resultArea = document.getElementById('result-area');
    const currentPackageNameInResultSpan = document.getElementById('current-package-name-in-result');
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    
    // --- 차트 관련 함수들 (수정 불필요) ---
    function showNoDataMessage(container) {
        if (!container) return;
        const h4 = container.previousElementSibling;
        while (container.firstChild) { container.removeChild(container.firstChild); }
        const p = document.createElement('p');
        p.textContent = '관련 데이터가 없습니다.';
        p.style.textAlign = 'center';
        p.style.padding = '50px 0';
        p.style.color = '#888';
        if(h4) container.appendChild(h4);
        container.appendChild(p);
    }
    
    function recreateCanvas(containerId, canvasId, h4Text) {
        const container = document.getElementById(containerId);
        if (!container) { console.error(`컨테이너 ID '${containerId}'를 찾을 수 없습니다.`); return null; }
        while (container.firstChild) { container.removeChild(container.firstChild); }
        const h4 = document.createElement('h4');
        h4.textContent = h4Text;
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        container.appendChild(h4);
        container.appendChild(canvas);
        return canvas;
    }

    function drawChart(canvas, chartConfig) { if (canvas) new Chart(canvas.getContext('2d'), chartConfig); }
    const chartColors = { pieMain: ['#2ecc71', '#e74c3c', '#95a5a6'], category: ['#3498db', '#e67e22', '#1abc9c', '#9b59b6', '#f1c40f'], topic: ['#27ae60', '#d35400', '#2980b9', '#c0392b', '#8e44ad'], detailSentiment: ['#16a085', '#2980b9', '#f39c12', '#d35400', '#c0392b'], issue: ['#c0392b', '#e67e22', '#f39c12'], keywordSentiment: ['#2ecc71', '#e74c3c', '#3498db'] };
    const commonChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

    // --- 서버 통신 함수 (수정 불필요) ---
    async function callApi(reviews, requestMode) {
        try {
            const res = await fetch(`/.netlify/functions/analyze-reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviews, requestMode }) });
            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.message || `[${res.status}] 서버 오류(${requestMode}).`);
            }
            return result;
        } catch (error) {
            console.error("callApi 중 오류:", error);
            throw error;
        }
    }

    // --- 결과 표시 함수들 (수정 불필요, 기존 코드에서 가져옴) ---

    // 1. 진단형 차트 그리는 함수
    function displayDiagnosticPackageCharts(apiData) {
        document.querySelectorAll('.charts-group').forEach(el => el.style.display = 'none');
        const chartGroup = document.getElementById('diagnostic-package-charts');
        if (!chartGroup) { console.error("CRITICAL: 'diagnostic-package-charts' 컨테이너를 HTML에서 찾을 수 없습니다."); return; }
        chartGroup.style.display = 'grid';

        let canvas1 = recreateCanvas('d_chart_1', 'sentimentPieChart_diag', '리뷰 감성 비율');
        const sc = apiData.sentimentCounts || {};
        if (canvas1 && (sc.positive > 0 || sc.negative > 0 || sc.neutral > 0)) { drawChart(canvas1, { type: 'pie', data: { labels: ['긍정', '부정', '중립/기타'], datasets: [{ data: [sc.positive, sc.negative, sc.neutral], backgroundColor: chartColors.pieMain }] }, options: commonChartOptions }); }
        else if (canvas1) { showNoDataMessage(canvas1.parentElement); }
        
        let canvas2 = recreateCanvas('d_chart_2', 'categoryMentionsPie_diag', '주요 카테고리별 언급량');
        const catData = apiData.categories?.filter(c => c.mentions > 0);
        if (canvas2 && catData && catData.length > 0) { drawChart(canvas2, { type: 'pie', data: { labels: catData.map(c => c.name), datasets: [{ data: catData.map(c => c.mentions), backgroundColor: chartColors.category }] }, options: commonChartOptions }); }
        else if (canvas2) { showNoDataMessage(canvas2.parentElement); }
        
        let canvas3 = recreateCanvas('d_chart_3', 'topicMentionsDoughnut_diag', '주요 토픽별 언급량');
        const topData = apiData.topics?.filter(t => t.mentions > 0);
        if(canvas3 && topData && topData.length > 0){ drawChart(canvas3, { type: 'doughnut', data: { labels: topData.map(t => t.name), datasets: [{ label: '언급 횟수', data: topData.map(t => t.mentions), backgroundColor: chartColors.topic }] }, options: commonChartOptions }); }
        else if (canvas3) { showNoDataMessage(canvas3.parentElement); }

        let canvas4 = recreateCanvas('d_chart_4', 'diagnosticDetailSentimentPieChart', '세부 감정 분포');
        const detData = apiData.detailedSentiment?.filter(d => d.count > 0);
        if(canvas4 && detData && detData.length > 0) { drawChart(canvas4, { type: 'pie', data: { labels: detData.map(d => d.label), datasets: [{ data: detData.map(d => d.count), backgroundColor: chartColors.detailSentiment }] }, options: commonChartOptions }); }
        else if (canvas4) { showNoDataMessage(canvas4.parentElement); }

        let canvas5 = recreateCanvas('d_chart_5', 'diagnosticIssueBarChart', '주요 문제점 언급량');
        const issData = apiData.issues?.filter(i => i.count > 0);
        if(canvas5 && issData && issData.length > 0) { drawChart(canvas5, { type: 'bar', data: { labels: issData.map(i => i.name), datasets: [{ label: '언급 횟수', data: issData.map(i => i.count), backgroundColor: chartColors.issue }] }, options: { ...commonChartOptions, indexAxis: 'y' } }); }
        else if (canvas5) { showNoDataMessage(canvas5.parentElement); }

        let canvas6 = recreateCanvas('d_chart_6', 'diagnosticKeywordSentimentBarChart', '키워드별 감성 점수');
        const kwData = apiData.keywordSentiments?.filter(k => k.score !== 0);
        if(canvas6 && kwData && kwData.length > 0) { drawChart(canvas6, { type: 'bar', data: { labels: kwData.map(k => k.keyword), datasets: [{ label: '감성 점수', data: kwData.map(k => k.score), backgroundColor: kwData.map(k => k.score > 0.3 ? chartColors.keywordSentiment[0] : (k.score < -0.3 ? chartColors.keywordSentiment[1] : chartColors.keywordSentiment[2])) }] }, options: { ...commonChartOptions, indexAxis: 'y', scales: { x: { beginAtZero: false, min: -1, max: 1 } } } }); }
        else if (canvas6) { showNoDataMessage(canvas6.parentElement); }
    }

    // 2. 텍스트 요약 정보 보여주는 함수
    function displaySummary(apiData) {
        const totalReviewsToDisplay = apiData?.totalReviewsAnalyzed || 0;
        let summaryHTML = `<h3><i class="fas fa-clipboard-list"></i> 분석 요약</h3><p><strong>총 분석 리뷰 수:</strong> ${totalReviewsToDisplay} 건</p>`;
        const sc = apiData.sentimentCounts || { positive: 0, negative: 0, neutral: 0 };
        summaryHTML += `<p><strong>긍정 평가 리뷰:</strong> ${sc.positive} 건</p><p><strong>부정 평가 리뷰:</strong> ${sc.negative} 건</p><p><strong>중립/기타 평가 리뷰:</strong> ${sc.neutral !== undefined ? sc.neutral : (totalReviewsToDisplay - sc.positive - sc.negative)} 건</p>`;
        const topKeywordsText = apiData.topKeywords?.map(kw => `${kw.keyword || '키워드'}(${kw.count || 0}회)`).join(', ') || "추출된 주요 키워드가 없습니다.";
        summaryHTML += `<p><strong><i class="fas fa-key"></i> 리뷰에서 자주 언급된 키워드:</strong> ${topKeywordsText}</p>`;
        if (apiData.categories && apiData.categories.length > 0) {
            summaryHTML += `<h4><i class="fas fa-tags"></i> 주요 카테고리 (${apiData.categories.length}개)</h4><ul>`;
            apiData.categories.forEach(cat => {
                summaryHTML += `<li>${cat.name || '카테고리'}: ${cat.mentions || 0}회 언급`;
                if(cat.sentimentScore !== undefined) summaryHTML += ` (점수: ${cat.sentimentScore.toFixed(2)})`;
                if(cat.diagnosticComment) summaryHTML += ` <small><i>(${cat.diagnosticComment})</i></small>`;
                summaryHTML += `</li>`;
            });
            summaryHTML += `</ul>`;
        }
        if (apiData.topics && apiData.topics.length > 0) {
            summaryHTML += `<h4><i class="fas fa-comments"></i> 주요 토픽 (${apiData.topics.length}개)</h4><ul>`;
            apiData.topics.forEach(topic => {
                summaryHTML += `<li>${topic.name || '토픽'}: ${topic.mentions || 0}회 언급`;
                if(topic.topicSentimentAndExperience) summaryHTML += ` <small><i>(${topic.topicSentimentAndExperience})</i></small>`;
                summaryHTML += `</li>`;
            });
            summaryHTML += `</ul>`;
        }
        if (apiData.customSummary) { summaryHTML += `<h4><i class="fas fa-lightbulb"></i> AI 심층 분석 요약</h4><p>${apiData.customSummary.replace(/\n/g, '<br>')}</p>`; }
        if (apiData.recommendations?.length > 0 && typeof apiData.recommendations[0] === 'object') {
            summaryHTML += `<h4><i class="fas fa-rocket"></i> 주요 개선 제안</h4>`;
            apiData.recommendations.forEach(rec => {
                summaryHTML += `<div style="margin-bottom: 10px;"><p style="margin-bottom: 3px;"><strong><i class="fas fa-wrench" style="color:#3498db;"></i> 제안:</strong> ${rec.proposal}</p>`;
                if (rec.expectedEffect) { summaryHTML += `<p style="margin-left: 20px; font-size:0.9em; color:#555;"><strong><i class="fas fa-chart-line" style="color:#27ae60;"></i> 예상 개선 효과:</strong> ${rec.expectedEffect}</p>`; }
                summaryHTML += `</div>`;
            });
        }
        if (apiData.riderFeedbackSummary && apiData.riderFeedbackSummary !== "배달 라이더 관련 직접 언급 없음") { summaryHTML += `<h4><i class="fas fa-motorcycle"></i> 라이더 피드백 요약</h4><p>${apiData.riderFeedbackSummary}</p>`; }
        if (apiData.representativePositiveReviews && apiData.representativePositiveReviews.length > 0) {
            summaryHTML += `<h4><i class="fas fa-quote-left"></i> 대표 긍정 리뷰 (최대 3개)</h4>`;
            apiData.representativePositiveReviews.forEach((review) => { if (review && review.trim()) { summaryHTML += `<blockquote style="font-style:italic; color:#555; border-left:3px solid #2ecc71; padding-left:10px; margin-left:0; margin-bottom:10px;">"${review.trim()}"</blockquote>`; } });
        }
        if (apiData.representativeNegativeReviews && apiData.representativeNegativeReviews.length > 0) {
            summaryHTML += `<h4><i class="fas fa-quote-right"></i> 대표 부정 리뷰 (최대 3개)</h4>`;
            apiData.representativeNegativeReviews.forEach((review) => { if (review && review.trim()) { summaryHTML += `<blockquote style="font-style:italic; color:#555; border-left:3px solid #e74c3c; padding-left:10px; margin-left:0; margin-bottom:10px;">"${review.trim()}"</blockquote>`; } });
        }
        if (sentimentSummaryDiv) { sentimentSummaryDiv.innerHTML = summaryHTML; }
    }
    
    // --- 대시보드 핵심 로직 ---
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            const testReviews = [
                "여기 음식 정말 맛있어요! 분위기도 최고!", "가격이 좀 비싸긴 한데 맛은 인정합니다.",
                "주차장이 너무 좁아서 불편했어요. 음식은 그냥 그래요.",
                "직원분이 너무 친절하셔서 기분 좋게 식사했습니다. 재방문 의사 100%",
                "음식이 너무 늦게 나와서 별로였습니다."
            ];
            processAndDisplayDashboard(testReviews);
        });
    }

    async function processAndDisplayDashboard() { // (reviews) 인자가 사라진 것을 확인!
    if (!refreshButton || !resultArea) return;

    refreshButton.disabled = true;
    refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 최신 데이터 로딩 중...';
    resultArea.style.display = 'none';
    if(sentimentSummaryDiv) sentimentSummaryDiv.innerHTML = '';
    
    try {
        // --- 여기가 핵심! Supabase DB에서 데이터 가져오기 ---
        console.log("Supabase DB에서 최신 분석 결과 가져오기 시도...");
        const { data, error } = await supabase
            .from('review_analysis_results') // 우리가 만든 테이블 이름
            .select('analysis_data')        // analysis_data 컬럼만 선택
            .order('analysis_date', { ascending: false }) // 가장 최신 날짜 순으로 정렬
            .limit(1)                       // 그중에서 1개만 가져오기
            .single();                      // 객체 하나로 받기

        if (error) {
            // 아직 데이터가 하나도 없으면 'PGRST116' 에러가 발생합니다. 정상입니다.
            if (error.code === 'PGRST116') {
                console.log("DB에 분석 결과가 아직 없습니다.");
                resultArea.innerHTML = `<p style="text-align:center; padding: 20px;">아직 분석된 데이터가 없습니다. 자동 분석이 실행될 때까지 기다려주세요.</p>`;
                resultArea.style.display = 'block';
                return; // 함수 종료
            }
            throw error; // 그 외의 진짜 에러는 던지기
        }
        // --- 여기까지가 DB 접속 코드 ---

        const analysisData = data.analysis_data; // DB에서 가져온 JSON 데이터
        console.log("DB에서 데이터 수신 성공!", analysisData);
        
        if (analysisData) {
            if(currentPackageNameInResultSpan) currentPackageNameInResultSpan.textContent = '진단형 (최신)';
            displayDiagnosticPackageCharts(analysisData);
            displaySummary(analysisData);
            resultArea.style.display = 'block';
            resultArea.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error("DB로부터 유효한 분석 데이터를 받지 못했습니다.");
        }
    } catch (error) {
        console.error("대시보드 처리 중 오류 발생:", error);
        resultArea.innerHTML = `<p style="color:red; text-align:center; padding: 20px;">결과를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
        resultArea.style.display = 'block';
    } finally {
        refreshButton.disabled = false;
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> 최신 분석 결과 불러오기';
    }
}
});