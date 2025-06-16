document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드 완료 - 멀티 차트 지원 최종 스크립트 실행");

    // --- 1. HTML 요소 변수 선언 ---
    const refreshButton = document.getElementById('refresh-button');
    const resultArea = document.getElementById('result-area');
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    const diagnosticChartsDiv = document.getElementById('diagnostic-package-charts');
    const userGreeting = document.getElementById('user-greeting');
    
    // 모달 관련 요소
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const openSignupModalBtn = document.getElementById('open-signup-modal-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginForm = document.getElementById('login-form');
    const loginMessageDiv = document.getElementById('login-message');
    // 회원가입 폼은 현재 기능이 없으므로 변수 선언은 생략합니다.

    let currentUser = null;
    let charts = {}; // 여러 개의 차트 객체를 관리하기 위한 객체

    // --- 2. 핵심 기능 함수 선언 ---

    /**
     * 모든 차트를 그리기 전에 기존 차트를 파괴하는 헬퍼 함수
     */
    function destroyAllCharts() {
        for (const chartId in charts) {
            if (charts[chartId]) {
                charts[chartId].destroy();
            }
        }
        charts = {}; // 차트 관리 객체 초기화
    }

    /**
     * 막대 그래프를 그리는 범용 함수
     */
    function renderBarChart(canvasId, title, labels, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.warn(`Canvas with id '${canvasId}' not found.`);
            return;
        }

        charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '언급 횟수',
                    data: data,
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // 가로 막대 그래프
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: title, font: { size: 16 } }
                }
            }
        });
    }
    
    /**
     * 도넛 그래프를 그리는 함수
     */
    function renderDoughnutChart(canvasId, title, labels, data) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.warn(`Canvas with id '${canvasId}' not found.`);
            return;
        }
        
        const backgroundColors = ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#c0392b', '#95a5a6'];

        charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: '분포',
                    data: data,
                    backgroundColor: backgroundColors.slice(0, data.length),
                    hoverOffset: 4
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
     * AI 분석 결과를 받아 모든 차트와 텍스트를 표시하는 메인 함수
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

        destroyAllCharts(); // 기존 차트 모두 삭제

        // 1. 상세 감성 분포 (도넛 차트) - d_chart_1 위치에 그림
        if (details.detailedSentiment && details.detailedSentiment.length > 0) {
            const labels = details.detailedSentiment.map(d => d.label);
            const data = details.detailedSentiment.map(d => d.count);
            renderDoughnutChart('sentimentDoughnutChart', '상세 감성 분포', labels, data);
        }

        // 2. 주요 키워드 (막대 차트) - d_chart_2 위치에 그림
        if (details.topKeywords && details.topKeywords.length > 0) {
            const labels = details.topKeywords.map(d => d.keyword);
            const data = details.topKeywords.map(d => d.count);
            renderBarChart('keywordBarChart', '주요 키워드 언급 빈도', labels, data);
        }

        // 3. 카테고리별 언급 (막대 차트) - d_chart_3 위치에 그림
        if (details.categories && details.categories.length > 0) {
            const labels = details.categories.map(d => d.name);
            const data = details.categories.map(d => d.mentions);
            renderBarChart('categoryBarChart', '카테고리별 언급 횟수', labels, data);
        }

        // 텍스트 분석 결과 표시
        let summaryHTML = `
            <h3>AI 심층 분석 요약</h3>
            <p style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; line-height: 1.7;">
                ${details.customSummary || '요약 정보가 없습니다.'}
            </p>
            <hr style="margin: 25px 0;"><h4>주요 개선 제안</h4>
            <ul>
                ${(details.recommendations && details.recommendations.length > 0)
                    ? details.recommendations.map(rec => `<li><strong>${rec.proposal}:</strong> ${rec.expectedEffect}</li>`).join('')
                    : '<li>제안 사항이 없습니다.</li>'
                }
            </ul>
        `;
        if(sentimentSummaryDiv) sentimentSummaryDiv.innerHTML = summaryHTML;
        
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

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
            } catch (e) {
                localStorage.removeItem('supabase.auth.token');
                updateUserUI(null);
            }
        } else {
            updateUserUI(null);
        }
    }

    // --- 3. 이벤트 리스너 연결 ---

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
                if (result.success) {
                    displayLatestAnalysis(result.data);
                } else {
                    alert("결과를 불러오는 데 실패했습니다: " + (result.message || '알 수 없는 오류'));
                }
            } catch (error) {
                alert("서버와 통신하는 중 오류가 발생했습니다.");
            } finally {
                refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> 최신 분석 결과 불러오기';
            }
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = loginForm.querySelector('#login-email').value.trim();
            const password = loginForm.querySelector('#login-password').value;
            loginMessageDiv.textContent = '로그인 중...';
            try {
                const response = await fetch('/.netlify/functions/loginUser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const result = await response.json();
                if (response.ok && result.success) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
                    updateUserUI(result.data.user);
                    loginMessageDiv.textContent = '로그인 성공!';
                    setTimeout(() => { 
                        if (loginModal) loginModal.style.display = 'none'; 
                        loginMessageDiv.textContent = ''; 
                        loginForm.reset(); 
                    }, 1000);
                } else {
                    loginMessageDiv.textContent = result.message || '로그인에 실패했습니다.';
                }
            } catch (error) {
                loginMessageDiv.textContent = '서버와 연결할 수 없습니다.';
            }
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

        if (openLoginModalBtn) {
            openLoginModalBtn.addEventListener('click', () => loginModal.style.display = 'flex');
        }
        if (openSignupModalBtn) {
            openSignupModalBtn.addEventListener('click', () => signupModal.style.display = 'flex');
        }
        
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
    
    // --- 4. 초기 실행 코드 ---
    checkLoginStatus();
    setupModalListeners();
});