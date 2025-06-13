// 파일 위치: netlify/functions/send-review-request.js

// Twilio 같은 SMS 발송 서비스를 이용하려면 먼저 해당 서비스에 가입하고 API 키를 받아야 합니다.
// npm install twilio (프로젝트에 twilio 설치 필요)
const twilio = require('twilio');

exports.handler = async (event) => {
    // --- 1. Twilio 계정 정보 (Netlify 환경 변수에 저장해야 함) ---
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Twilio에서 발급받은 번호

    if (!accountSid || !authToken || !twilioPhoneNumber) {
        return { statusCode: 500, body: JSON.stringify({ message: "SMS 발송 서비스 설정이 필요합니다." }) };
    }
    
    const client = twilio(accountSid, authToken);

    try {
        // --- 2. 프론트엔드에서 보낸 고객 정보 받기 ---
        const { customerPhone, storeName, googleReviewUrl } = JSON.parse(event.body);

        if (!customerPhone || !storeName || !googleReviewUrl) {
            return { statusCode: 400, body: JSON.stringify({ message: "필수 정보(고객 번호, 가게 이름, 리뷰 URL)가 누락되었습니다." }) };
        }

        // --- 3. 고객에게 보낼 메시지 작성 ---
        const messageBody = `[${storeName}] 고객님, 이용해주셔서 감사합니다! 😊 잠시 시간을 내어 소중한 리뷰를 남겨주시면 가게 운영에 큰 힘이 됩니다. 아래 링크를 클릭해 참여해주세요! ▶ ${googleReviewUrl}`;

        // --- 4. 메시지 발송 실행 ---
        console.log(`'${customerPhone}' 번호로 리뷰 요청 메시지 발송 시도...`);
        const message = await client.messages.create({
            body: messageBody,
            from: twilioPhoneNumber,
            to: `+82${customerPhone.substring(1)}` // 국가번호(+82) 형식으로 변경 (예: 01012345678 -> +821012345678)
        });

        console.log("메시지 발송 성공! SID:", message.sid);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: "리뷰 요청 메시지를 성공적으로 발송했습니다." }),
        };

    } catch (error) {
        console.error("SMS 발송 중 오류 발생:", error);
        // Twilio 오류는 좀 더 구체적인 정보를 포함하는 경우가 많습니다.
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: `SMS 발송 실패: ${error.message}` }),
        };
    }
};