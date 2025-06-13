const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return { statusCode: 500, body: JSON.stringify({ success: false, message: "서버 환경 변수가 설정되지 않았습니다." }) };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const { userId } = JSON.parse(event.body);
        if (!userId) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: '사용자 ID가 필요합니다.' }) };
        }
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) { throw error; }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true, message: '사용자가 성공적으로 삭제되었습니다.' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message || '서버 오류' }),
        };
    }
};