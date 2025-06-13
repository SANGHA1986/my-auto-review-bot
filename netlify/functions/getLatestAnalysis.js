const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data, error } = await supabase
            .from('review_analysis_results')
            .select('*')
            .order('created_at', { ascending: false }) // 가장 최신 순서로 정렬
            .limit(1) // 1개만 가져오기
            .single(); // 결과가 1개가 아니면 에러 발생

        if (error) {
            throw error;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, data }),
        };
    } catch (error) {
        console.error("Error fetching latest analysis:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: error.message }),
        };
    }
};