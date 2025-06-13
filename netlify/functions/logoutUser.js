const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "서버 설정 오류." }) };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = event.headers.authorization?.split(' ')[1];

    if (!token) {
        return { statusCode: 401, body: JSON.stringify({ success: false, message: '인증 토큰이 없습니다.' }) };
    }
    try {
        const { error } = await supabase.auth.signOut(token);
        if (error) { throw error; }
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: '성공적으로 로그아웃되었습니다.' }),
        };
    } catch (e) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: '로그아웃 처리 중 예외 발생' }) };
    }
};