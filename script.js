document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM 로드 완료 - 최종 안정화 스크립트 실행 시작");

    // --- 1. HTML 요소 변수 선언 ---
    const refreshButton = document.getElementById('refresh-button');
    const resultArea = document.getElementById('result-area');
    const sentimentSummaryDiv = document.getElementById('sentiment-summary');
    const diagnosticChartsDiv = document.getElementById('diagnostic-package-charts');

    const openLoginModalBtn = document.getElementById('open-login-modal-btn');
    const openSignupModalBtn = document.getElementById('open-signup-modal-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userGreeting = document.getElementById('user-greeting');
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const loginMessageDiv = document.getElementById('login-message');

    let currentUser = null;

    // --- 2. 핵심 기능 함수 선언 ---

    /**
     * [최종 수정] 어떤 데이터에도 오류 없이 안전하게 동작하는 최종 분석 표시 함수
     */
    function displayLatestAnalysis(analysisData) {
        if (!resultArea || !sentimentSummaryDiv || !diagnosticChartsDiv) return;

        const details = analysisData.analysis_data; 

        if (!details) {
            alert('상세 분석 데이터가 존재하지 않습니다. DB에 데이터가 올바르게 저장되었는지 확인해주세요.');
            sentimentSummaryDiv.innerHTML = `<p style="color: red;">표시할 상세 분석 데이터가 없습니다.</p>`;
            resultArea.style.display = 'block';
            resultArea.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        resultArea.style.display = 'block';
        diagnosticChartsDiv.style.display = 'grid';

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

            <hr style="margin: 25px 0;">

            <h4>상세 감성 분포</h4>
            <p>${(details.detailedSentiment && details.detailedSentiment.length > 0) ? details.detailedSentiment.map(s => `${s.label}: ${s.count}건`).join(', ') : '감성 분포 정보 없음'}</p>

            <h4>언급된 주요 문제점</h4>
            <p>${(details.issues && details.issues.length > 0) ? details.issues.map(i => `${i.name}: ${i.count}회`).join(', ') : '언급된 문제점 없음'}</p>

            <h4>대표 긍정 리뷰 <span style="color: blue;">😊</span></h4>
            <blockquote style="border-left: 3px solid #28a745; padding-left: 15px; margin-left: 0; font-style: italic;">
                ${(details.representativePositiveReviews && details.representativePositiveReviews.length > 0) ? details.representativePositiveReviews.map(r => `<p>"${r}"</p>`).join('') : '<p>대표 긍정 리뷰 없음</p>'}
            </blockquote>

            <h4>대표 부정 리뷰 <span style="color: red;">😠</span></h4>
            <blockquote style="border-left: 3px solid #dc3545; padding-left: 15px; margin-left: 0; font-style: italic;">
                ${(details.representativeNegativeReviews && details.representativeNegativeReviews.length > 0) ? details.representativeNegativeReviews.map(r => `<p>"${r}"</p>`).join('') : '<p>대표 부정 리뷰 없음</p>'}
            </blockquote>
        `;

        sentimentSummaryDiv.innerHTML = summaryHTML;
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
                if (!response.ok) {
                    throw new Error(`서버 응답 오류: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                    displayLatestAnalysis(result.data);
                } else {
                    alert("결과를 불러오는 데 실패했습니다: " + (result.message || '알 수 없는 오류'));
                }
            } catch (error) {
                console.error("결과 로딩 중 에러:", error);
                alert("서버와 통신하는 중 심각한 오류가 발생했습니다.");
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

    checkLoginStatus();
});