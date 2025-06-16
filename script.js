document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드 완료 - 비즈니스 분석용 최종 스크립트 실행");

    // --- 1. HTML 요소 변수 선언 ---
    const refreshButton = document.getElementById('refresh-button');
    const resultArea = document.getElementById('result-area');
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    const diagnosticChartsDiv = document.getElementById('diagnostic-package-charts');
    const userGreeting = document.getElementById('user-greeting');
    const loginModal = document.getElementById('login-modal');
    // ... (다른 요소 변수들은 그대로)

    let currentUser = null;
    let charts = {};

    // --- 2. 핵심 기능 함수 선언 ---

    function destroyAllCharts() {
        for (const chartId in charts) {
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
        }
        charts = {};
    }

    /**
     * [신규] 긍/부정 값에 따라 색상을 다르게 표시하는 막대 그래프 함수
     */
    function renderSentimentBarChart(canvasId, title, labels, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        // 감성 점수에 따라 색상 결정
        const backgroundColors = data.map(score => score >= 0 ? 'rgba(52, 152, 219, 0.8)' : 'rgba(231, 76, 60, 0.8)');

        charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '감성 점수',
                    data: data,
                    backgroundColor: backgroundColors,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: title, font: { size: 16 } }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        min: -1.0,
                        max: 1.0,
                    }
                }
            }
        });
    }
    
    function renderDoughnutChart(canvasId, title, labels, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        const backgroundColors = ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#c0392b', '#95a5a6'];

        charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: '분포',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: title, font: { size: 16 } }
                }
            }
        });
    }

    /**
     * [업그레이드] 새로운 데이터 구조를 화면에 모두 표시하는 메인 함수
     */
    function displayLatestAnalysis(analysisData) {
        if (!resultArea) return;
        const details = analysisData.analysis_data; 
        if (!details) {
            alert('상세 분석 데이터가 존재하지 않습니다.');
            return;
        }

        resultArea.style.display = 'block';
        if(diagnosticChartsDiv) diagnosticChartsDiv.style.display = 'grid';

        destroyAllCharts();

        // 1. 상세 감성 분포 (도넛 차트)
        if (details.detailedSentiment && details.detailedSentiment.length > 0) {
            renderDoughnutChart('sentimentDoughnutChart', '상세 감성 분포', 
                details.detailedSentiment.map(d => d.label), 
                details.detailedSentiment.map(d => d.count)
            );
        }

        // 2. 주요 키워드 감성 점수 (감성 막대 차트)
        if (details.topKeywords && details.topKeywords.length > 0) {
            renderSentimentBarChart('keywordBarChart', '주요 키워드별 감성 점수',
                details.topKeywords.map(d => d.keyword),
                details.topKeywords.map(d => d.sentimentScore)
            );
        }

        // 3. 카테고리별 감성 점수 (감성 막대 차트)
        if (details.categories && details.categories.length > 0) {
            renderSentimentBarChart('categoryBarChart', '카테고리별 감성 점수',
                details.categories.map(d => d.name),
                details.categories.map(d => d.sentimentScore)
            );
        }
        
        // 텍스트 분석 결과 표시 (업그레이드)
        let summaryHTML = `
            <h3>AI 심층 분석 요약</h3>
            <p style="background-color: #f8f9fa; padding: 15px; border-radius: 8px;">${details.executiveSummary || '요약 정보가 없습니다.'}</p>
            
            <hr style="margin: 25px 0;"><h4>카테고리별 세부 진단</h4>`;
        
        if (details.categories && details.categories.length > 0) {
            summaryHTML += '<ul>';
            details.categories.forEach(cat => {
                summaryHTML += `<li><strong>${cat.name} (점수: ${cat.sentimentScore?.toFixed(2)})</strong>
                                  <br>👍 칭찬: ${cat.positiveAspects?.join(', ') || '없음'}
                                  <br>👎 아쉬운 점: ${cat.negativeAspects?.join(', ') || '없음'}
                               </li>`;
            });
            summaryHTML += '</ul>';
        } else {
            summaryHTML += '<p>카테고리 진단 정보가 없습니다.</p>';
        }

        summaryHTML += `<hr style="margin: 25px 0;"><h4>데이터 기반 실행 계획</h4>`;

        if (details.actionableRecommendations && details.actionableRecommendations.length > 0) {
            summaryHTML += '<ul>';
            details.actionableRecommendations.forEach(rec => {
                summaryHTML += `<li><strong>제안: ${rec.proposal}</strong>
                                  <br>📈 기대 효과: ${rec.expectedEffect}
                                  <br>🤔 데이터 근거: ${rec.basis}
                               </li>`;
            });
            summaryHTML += '</ul>';
        } else {
            summaryHTML += '<p>실행 계획 정보가 없습니다.</p>';
        }

        if(sentimentSummaryDiv) sentimentSummaryDiv.innerHTML = summaryHTML;
        
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    // --- 이하 다른 함수들은 이전과 동일합니다 ---
    function updateUserUI(user) {
        currentUser = user;
        if (user && user.email) {
            openLoginModalBtn.style.display = 'none';
            openSignupModalBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-flex';
            const userName = user.user_metadata?.name || user.email.split('@')[0];
            userGreeting.innerHTML = `<strong>${userName}</strong>님, 환영합니다!`;
            userGreeting.style.display = 'block';
        } else {
            openLoginModalBtn.style.display = 'inline-flex';
            openSignupModalBtn.style.display = 'inline-flex';
            logoutBtn.style.display = 'none';
            userGreeting.style.display = 'none';
            resultArea.style.display = 'none';
        }
    }
    async function checkLoginStatus() {
        const storedTokenData = localStorage.getItem('supabase.auth.token');
        if (storedTokenData) {
            try {
                const sessionData = JSON.parse(storedTokenData);
                updateUserUI(sessionData.user);
            } catch (e) { localStorage.removeItem('supabase.auth.token'); updateUserUI(null); }
        } else { updateUserUI(null); }
    }
    if (refreshButton) {
        refreshButton.addEventListener('click', async function() {
            if (!currentUser) {
                alert("로그인한 사용자만 최신 결과를 볼 수 있습니다.");
                if (loginModal) loginModal.style.display = 'flex';
                return;
            }
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 불러오는 중...';
            try {
                const response = await fetch('/.netlify/functions/getLatestAnalysis');
                const result = await response.json();
                if (result.success) { displayLatestAnalysis(result.data); } 
                else { alert("결과를 불러오는 데 실패했습니다: " + (result.message || '알 수 없는 오류')); }
            } catch (error) { alert("서버와 통신하는 중 오류가 발생했습니다.");
            } finally { refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> 최신 분석 결과 불러오기'; }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('supabase.auth.token');
            updateUserUI(null);
            alert('로그아웃되었습니다.');
        });
    }
    function setupModalListeners() {
        const allCloseButtons = document.querySelectorAll('.close-btn, #cancel-login-btn, #cancel-signup-btn');
        if (openLoginModalBtn) { openLoginModalBtn.addEventListener('click', () => loginModal.style.display = 'flex'); }
        if (openSignupModalBtn) { openSignupModalBtn.addEventListener('click', () => signupModal.style.display = 'flex'); }
        allCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (loginModal) loginModal.style.display = 'none';
                if (signupModal) signupModal.style.display = 'none';
            });
        });
        window.addEventListener('click', (event) => {
            if (event.target === loginModal) loginModal.style.display = 'none';
            if (event.target === signupModal) signupModal.style.display = 'none';
        });
    }
    checkLoginStatus();
    setupModalListeners();
});