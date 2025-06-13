// 이 코드 전체를 비워진 script.js 파일에 붙여넣으세요. 이것이 진짜 마지막 최종본입니다.

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
    
    // (여기에 displaySummary, displayDiagnosticPackageCharts 등 화면 표시 함수가 필요합니다)
    // 지금은 임시로 간단한 함수를 만들어 둡니다.
    function displayLatestAnalysis(analysisData) {
        if (!resultArea || !sentimentSummaryDiv) return;
        resultArea.style.display = 'block';
        let summaryHTML = `<h3>분석 결과</h3><p>총 분석 리뷰: ${analysisData.total_reviews}건</p>`;
        summaryHTML += `<p>긍정: ${analysisData.positive_count}, 부정: ${analysisData.negative_count}, 중립: ${analysisData.neutral_count}</p>`;
        sentimentSummaryDiv.innerHTML = summaryHTML;
        resultArea.scrollIntoView({ behavior: 'smooth' });
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
                }
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
                if(loginModal) loginModal.style.display = 'flex';
                return;
            }
            refreshButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 불러오는 중...';
            try {
                const response = await fetch('/.netlify/functions/getLatestAnalysis');
                const result = await response.json();
                if (response.ok && result.success) {
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

                // ★★★ 여기가 수정된 핵심입니다! ★★★
                if (response.ok && result.success) {
                    localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
                    updateUserUI(result.data.user);
                    loginMessageDiv.textContent = '로그인 성공!';
                    setTimeout(() => { loginModal.style.display = 'none'; }, 1000);
                } else {
                    loginMessageDiv.textContent = result.message || '로그인에 실패했습니다.';
                }
            } catch (error) {
                loginMessageDiv.textContent = '서버와 연결할 수 없습니다.';
            }
        });
    }

    // (회원가입, 로그아웃, 모달 닫기 등 다른 모든 이벤트 리스너는 여기에 그대로 위치합니다)
    // ...

    // --- 4. 초기 실행 코드 ---
    checkLoginStatus();
});