// 이 코드 전체를 비워진 script.js 파일에 붙여넣으세요. 이것이 진짜 최종본입니다.

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드 완료 - 진짜 최종 스크립트 실행 시작");

    // --- 1. HTML 요소 변수 선언 ---
    const refreshButton = document.getElementById('refresh-button');
    const resultArea = document.getElementById('result-area');
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const openSignupModalBtn = document.getElementById('open-signup-modal-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userGreeting = document.getElementById('user-greeting');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginMessageDiv = document.getElementById('login-message');
    const signupModal = document.getElementById('signup-modal');
    const signupForm = document.getElementById('signup-form');
    const signupMessageDiv = document.getElementById('signup-message');

    let currentUser = null;

    // --- 2. 핵심 기능 함수 선언 ---

    const chartColors = { pieMain: ['#2ecc71', '#e74c3c', '#95a5a6'], category: ['#3498db', '#e67e22', '#1abc9c', '#9b59b6', '#f1c40f'], topic: ['#27ae60', '#d35400', '#2980b9', '#c0392b', '#8e44ad'], detailSentiment: ['#16a085', '#2980b9', '#f39c12', '#d35400', '#c0392b'], issue: ['#c0392b', '#e67e22', '#f39c12'], keywordSentiment: ['#2ecc71', '#e74c3c', '#3498db'] };
    const commonChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

    function showNoDataMessage(container) {
        if (!container) return;
        while (container.firstChild) { container.removeChild(container.firstChild); }
        const h4 = container.previousElementSibling || document.createElement('h4');
        const p = document.createElement('p');
        p.textContent = '표시할 데이터가 없습니다.';
        p.style.cssText = 'text-align: center; padding: 50px 0; color: #888;';
        container.appendChild(h4);
        container.appendChild(p);
    }

    function recreateCanvas(containerId, canvasId, h4Text) {
        const container = document.getElementById(containerId);
        if (!container) { console.error(`Error: Canvas container #${containerId} not found.`); return null; }
        while (container.firstChild) { container.removeChild(container.firstChild); }
        const h4 = document.createElement('h4');
        h4.textContent = h4Text;
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        container.appendChild(h4);
        container.appendChild(canvas);
        return canvas;
    }

    function drawChart(canvas, chartConfig) {
        if (canvas) {
            // 기존 차트 인스턴스가 있으면 파괴
            if (window.chartInstances && window.chartInstances[canvas.id]) {
                window.chartInstances[canvas.id].destroy();
            }
            // 새 차트 인스턴스 생성 및 저장
            window.chartInstances = window.chartInstances || {};
            window.chartInstances[canvas.id] = new Chart(canvas, chartConfig);
        }
    }
    
    function displaySummary(apiData) {
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    if (!apiData || !sentimentSummaryDiv) return;

    const totalReviews = apiData.totalReviewsAnalyzed || 0;
    const sc = apiData.sentimentCounts || { positive: 0, negative: 0, neutral: 0 };
    let summaryHTML = `
        <h3><i class="fas fa-clipboard-check"></i> 분석 요약</h3>
        <p><strong>총 분석 리뷰 수:</strong> ${totalReviews} 건</p>
        <p><strong>긍정:</strong> ${sc.positive} 건, <strong>부정:</strong> ${sc.negative} 건, <strong>중립:</strong> ${sc.neutral} 건</p>
    `;

    const keywords = apiData.topKeywords?.map(kw => `${kw.keyword}(${kw.count}회)`).join(', ');
    if (keywords) {
        summaryHTML += `<p><strong><i class="fas fa-key"></i> 주요 키워드:</strong> ${keywords}</p>`;
    }

    if (apiData.customSummary) {
        summaryHTML += `<h4><i class="fas fa-lightbulb"></i> AI 심층 분석</h4><p>${apiData.customSummary}</p>`;
    }

    if (apiData.recommendations?.length > 0) {
        summaryHTML += `<h4><i class="fas fa-rocket"></i> 개선 제안</h4><ul>`;
        apiData.recommendations.forEach(rec => {
            summaryHTML += `<li>${rec.proposal || rec}</li>`;
        });
        summaryHTML += `</ul>`;
    }
    sentimentSummaryDiv.innerHTML = summaryHTML;
}

    function displayLatestAnalysis(analysisResult) {
        if (!analysisResult || !analysisResult.analysis_data) {
            alert("가져온 데이터가 비어있거나 형식이 잘못되었습니다.");
            return;
        }
        if (resultArea) resultArea.style.display = 'block';
        displayDiagnosticPackageCharts(analysisResult.analysis_data);
        displaySummary(analysisResult.analysis_data);
        if (resultArea) resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    function updateUserUI(user) { 
        currentUser = user;
        if (user && user.email) {
            if (openLoginModalBtn) openLoginModalBtn.style.display = 'none';
            if (openSignupModalBtn) openSignupModalBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-flex';
            if (userGreeting) {
                const userName = user.user_metadata?.name || user.email.split('@')[0];
                userGreeting.innerHTML = `<strong>${userName}</strong>님, 환영합니다!`;
                userGreeting.style.display = 'block';
            }
        } else {
            if (openLoginModalBtn) openLoginModalBtn.style.display = 'inline-flex';
            if (openSignupModalBtn) openSignupModalBtn.style.display = 'inline-flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userGreeting) userGreeting.style.display = 'none';
        }
    }

    async function checkLoginStatus() {
        const storedTokenData = localStorage.getItem('supabase.auth.token');
        if (storedTokenData) {
            try {
                const sessionData = JSON.parse(storedTokenData);
                if (sessionData && sessionData.user) {
                    updateUserUI(sessionData.user);
                } else {
                    localStorage.removeItem('supabase.auth.token');
                    updateUserUI(null);
                }
            } catch (e) {
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
                if(loginModal) loginModal.style.display = 'flex';
                return;
            }
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 불러오는 중...';
            refreshButton.disabled = true;
            try {
                const response = await fetch('/.netlify/functions/getLatestAnalysis');
                if (!response.ok) throw new Error(`서버 오류: ${response.statusText}`);
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
                refreshButton.disabled = false;
            }
        });
    }

    if (openLoginModalBtn) openLoginModalBtn.addEventListener('click', () => { if(loginModal) loginModal.style.display = 'flex'; });
    if (openSignupModalBtn) openSignupModalBtn.addEventListener('click', () => { if(signupModal) signupModal.style.display = 'flex'; });
    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('supabase.auth.token'); updateUserUI(null); });

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = loginForm.querySelector('#login-email').value.trim();
            const password = loginForm.querySelector('#login-password').value;
            loginMessageDiv.textContent = '로그인 중...';
            try {
                const response = await fetch('/.netlify/functions/loginUser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
                const result = await response.json();
                if (result.success) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
                    updateUserUI(result.data.user);
                    loginMessageDiv.textContent = '로그인 성공!';
                    setTimeout(() => { loginModal.style.display = 'none'; }, 1000);
                } else {
                    loginMessageDiv.textContent = result.message || '로그인 실패.';
                }
            } catch (error) {
                loginMessageDiv.textContent = '서버 통신 오류.';
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = signupForm.querySelector('#signup-name').value.trim();
            const email = signupForm.querySelector('#signup-email').value.trim();
            const password = signupForm.querySelector('#signup-password').value;
            const passwordConfirm = signupForm.querySelector('#signup-password-confirm').value;
            if (password !== passwordConfirm) {
                signupMessageDiv.textContent = '비밀번호가 일치하지 않습니다.';
                return;
            }
            signupMessageDiv.textContent = '가입 정보를 전송 중입니다...';
            try {
                const response = await fetch('/.netlify/functions/registerUser', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
                const result = await response.json();
                if (result.success) {
                    signupMessageDiv.textContent = '회원가입이 완료되었습니다! 잠시 후 로그인 해주세요.';
                    setTimeout(() => { signupModal.style.display = 'none'; }, 2000);
                } else {
                    signupMessageDiv.textContent = result.message || '회원가입 실패.';
                }
            } catch (error) {
                signupMessageDiv.textContent = '서버 통신 오류.';
            }
        });
    }

    document.querySelectorAll('.close-btn, #cancel-login-btn, #cancel-signup-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal-overlay').style.display = 'none';
        });
    });

    // --- 4. 초기 실행 코드 ---
    checkLoginStatus();
});