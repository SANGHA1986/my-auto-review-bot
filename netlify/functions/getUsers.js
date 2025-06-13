const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // 환경 변수를 Netlify 서버에서 직접 가져옵니다.
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 환경 변수가 설정되지 않았는지 확인하는 방어 코드
    if (!supabaseUrl || !serviceKey) {
        const errorMessage = "서버 환경 변수(Supabase URL 또는 Service Key)가 설정되지 않았습니다.";
        console.error(errorMessage);
        return { statusCode: 500, body: JSON.stringify({ message: errorMessage }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        // Supabase 관리자 API를 사용하여 모든 사용자 목록을 가져옵니다.
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error("Supabase listUsers 오류:", error);
            throw new Error(`Supabase 사용자 목록 조회 실패: ${error.message}`);
        }

        // 성공적으로 사용자 목록을 반환합니다.
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(users),
        };
    } catch (error) {
        console.error("getUsers 핸들러 오류:", error);
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};