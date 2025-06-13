const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "서버 환경 변수가 설정되지 않았습니다." }) };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { email, password } = JSON.parse(event.body);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes("Invalid login credentials")) {
                return { statusCode: 401, body: JSON.stringify({ success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." }) };
            }
            throw error;
        }
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message || '서버 오류' }),
        };
    }
};