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

    try {
        const { name, company, phone, email, password } = JSON.parse(event.body);
        if (!email || !password) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: "이메일과 비밀번호는 필수입니다." }) };
        }
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    company_name: company,
                    phone_number: phone,
                    product_type: '실속형',
                },
            },
        });
        if (error) {
            if (error.message.includes("User already registered")) {
                return { statusCode: 409, body: JSON.stringify({ success: false, message: "이미 가입된 이메일 주소입니다." }) };
            }
            throw error;
        }
        const message = data.user && !data.user.email_confirmed_at ? "가입 확인 이메일이 발송되었습니다. 이메일을 확인해주세요." : "회원가입이 완료되었습니다. 로그인 해주세요.";
        return {
            statusCode: 201,
            body: JSON.stringify({ success: true, message }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message || '서버 오류 발생' }),
        };
    }
};