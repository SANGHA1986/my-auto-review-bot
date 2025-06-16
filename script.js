document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드 완료 - 최종 안정화 스크립트 실행 시작");

    // --- 1. HTML 요소 변수 선언 ---
    // 버튼 및 UI 요소
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

    let currentUser = null;
    let sentimentChart = null; // 차트 객체를 저장할 변수

    // --- 2. 핵심 기능 함수 선언 ---

    /**
     * [해결책 3] 상세 감성 데이터로 도넛 차트를 그리는 함수
     */
    function renderSentimentChart(sentimentData) {
        const chartContainer = document.getElementById('d_chart_1');
        if (!chartContainer) return;

        // 이전 차트가 있으면 파괴하여 중복 생성을 방지
        if (sentimentChart) {
            sentimentChart.destroy();
        }

        const labels = sentimentData.map(d => d.label);
        const data = sentimentData.map(d => d.count);

        sentimentChart = new Chart(chartContainer, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: '감성 분포',
                    data: data,
                    backgroundColor: [
                        '#2ecc71', // 긍정
                        '#3498db', // 매우 긍정
                        '#f1c40f', // 중립
                        '#e74c3c', // 부정
                        '#c0392b'  // 매우 부정
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: '상세 감성 분포 그래프'
                    }
                }
            }
        });
    }

    /**
     * AI 분석 결과를 화면에 표시하는 함수 (차트 렌더링 포함)
     */
    function displayLatestAnalysis(analysisData) {
        if (!resultArea || !sentimentSummaryDiv || !diagnosticChartsDiv) return;

        const details = analysisData.analysis_data; 
        
        if (!details) {
            alert('상세 분석 데이터가 존재하지 않습니다.');
            return;
        }

        resultArea.style.display = 'block';
        diagnosticChartsDiv.style.display = 'grid';

        // [해결책 3] 상세 감성 데이터가 있으면 차트 그리기 함수 호출
        if (details.detailedSentiment && details.detailedSentiment.length > 0) {
            renderSentimentChart(details.detailedSentiment);
        }

        let summaryHTML = `
            <h3>AI 심층 분석 요약</h3>
            <p style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; line-height: 1.7;">
                ${details.customSummary || '요약 정보가 없습니다.'}
            </p>
            <hr style="margin: 25px 0;">
            <h4>주요 개선 제안</h4>
            <ul>
                ${(details.recommendations && details.recommendations.length > 0)
                    ? details.recommendations.map(rec => `<li><strong>${rec.proposal || '알수없음'}:</strong> ${rec.expectedEffect || '내용없음'}</li>`).join('')
                    : '<li>제안 사항이 없습니다.</li>'
                }
            </ul>
        `;
        sentimentSummaryDiv.innerHTML = summaryHTML;
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * 로그인/로그아웃 상태에 따라 화면 UI를 변경하는 함수
     */
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

    /**
     * 페이지 로드 시, 브라우저에 저장된 로그인 정보가 있는지 확인하는 함수
     */
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

    // '최신 분석 결과 불러오기' 버튼
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
    
    // '로그인' 폼 제출
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

    // '로그아웃' 버튼
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('supabase.auth.token');
            updateUserUI(null);
            alert('로그아웃되었습니다.');
        });
    }

    // [해결책 1, 2] 모든 모달(팝업창) 관련 버튼 기능 연결
    function setupModalListeners() {
        const allCloseButtons = document.querySelectorAll('.close-btn, .cancel-btn');

        if (openLoginModalBtn) {
            openLoginModalBtn.addEventListener('click', () => {
                loginModal.style.display = 'flex';
            });
        }
        if (openSignupModalBtn) {
            openSignupModalBtn.addEventListener('click', () => {
                signupModal.style.display = 'flex';
            });
        }
        
        allCloseButtons.forEach(button => {
            button.addEventListener('click', () => {
                if (loginModal) loginModal.style.display = 'none';
                if (signupModal) signupModal.style.display = 'none';
                // 다른 모달이 있다면 여기에 추가
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target === loginModal) {
                loginModal.style.display = 'none';
            }
            if (event.target === signupModal) {
                signupModal.style.display = 'none';
            }
        });
    }
    
    // --- 4. 초기 실행 코드 ---
    checkLoginStatus();
    setupModalListeners(); // 모달 리스너 함수 호출
});