const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return { statusCode: 500, body: JSON.stringify({ message: "서버 환경 변수가 설정되지 않았습니다." }) };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    try {
        const { userId, productType, expiryDate } = JSON.parse(event.body);
        if (!userId || !productType) {
            return { statusCode: 400, body: JSON.stringify({ success: false, message: '사용자 ID와 상품 종류는 필수입니다.' })};
        }
        const updateData = {
            product_type: productType,
            subscription_expires_at: (productType === '실속형' || !expiryDate) ? null : expiryDate
        };
        const { data, error } = await supabase.auth.admin.updateUserById(
            userId, { user_metadata: updateData }
        );
        if (error) { throw error; }
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: '사용자 구독 정보가 성공적으로 업데이트되었습니다.' }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message || '서버 내부 오류가 발생했습니다.' })
        };
    }
};