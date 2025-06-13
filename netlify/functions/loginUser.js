 const { createClient } = require('@supabase/supabase-js');

 exports.handler = async (event) => {
     // 1. 요청 방식이 POST가 아니면 돌려보내기
     if (event.httpMethod !== 'POST') {
         return {
             statusCode: 405,
             body: JSON.stringify({ success: false, message: "Method Not Allowed" })
         };
     }

     try {
         // 2. Supabase 접속 준비 (환경 변수 확인)
         const supabaseUrl = process.env.SUPABASE_URL;
         const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

         if (!supabaseUrl || !supabaseAnonKey) {
             // 환경 변수가 없으면, 서버에 문제가 있다고 알려주기
             console.error("Supabase 환경 변수가 설정되지 않았습니다.");
             return { 
                 statusCode: 500, 
                 body: JSON.stringify({ success: false, message: "서버 환경 설정 오류." })
             };
         }
         
         const supabase = createClient(supabaseUrl, supabaseAnonKey);
         
         // 3. 손님이 보낸 이메일과 비밀번호 꺼내기
         const { email, password } = JSON.parse(event.body);

         // 4. Supabase에 "이 사람 로그인 시켜줘!" 라고 요청하기
         const { data, error } = await supabase.auth.signInWithPassword({ email, password });

         // 5. Supabase가 "에러났어!" 라고 답장을 보냈다면...
         if (error) {
             console.error("Supabase 로그인 오류:", error.message);
             // 에러 메시지에 따라 친절하게 안내하기
             if (error.message.includes("Invalid login credentials")) {
                 return { 
                     statusCode: 401, // 401: 인증 실패
                     body: JSON.stringify({ success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." })
                 };
             }
             // 그 외 다른 에러라면, 일반적인 서버 오류로 안내
             return { 
                 statusCode: 400, // 400: 잘못된 요청
                 body: JSON.stringify({ success: false, message: "로그인에 실패했습니다. 다시 시도해주세요." }) 
             };
         }
         
         // 6. 모든 것이 성공했다면, "성공했어!" 라는 정보와 사용자 정보를 함께 돌려주기
         return {
             statusCode: 200,
             body: JSON.stringify({ success: true, data }),
         };

     } catch (error) {
         // 7. 예상치 못한 다른 모든 에러가 발생했다면...
         console.error("loginUser 함수 내부 오류:", error);
         return {
             statusCode: 500, // 500: 서버 내부 오류
             body: JSON.stringify({ success: false, message: '서버 내부 오류가 발생했습니다.' }),
         };
     }
 };