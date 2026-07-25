import './Footer.css';

/** 하단 푸터. 회사·연락처는 전부 포트폴리오 데모 예시(TicketingLab). Figma 02 footer. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__cols">
          <div>
            <p className="footer__heading">(주)티케팅랩</p>
            <p className="footer__line">
              서울특별시 성동구 성수일로 00, 0층
              <br />
              사업자등록번호 000-00-00000 · 대표 김예매
              <br />
              통신판매업신고 2026-서울성동-0000
            </p>
          </div>
          <div>
            <p className="footer__heading">고객센터</p>
            <p className="footer__line">
              예매 1600-0000
              <br />
              이메일 help@ticketinglab.dev
              <br />
              평일 09:00 ~ 18:00 (주말·공휴일 휴무)
            </p>
          </div>
        </div>
        <div className="footer__divider" />
        <p className="footer__legal">
          (주)티케팅랩은 대규모 트래픽 처리를 시연하기 위한 포트폴리오 데모입니다. 실제
          예매·결제·환불은 제공하지 않으며, 표기된 회사·연락처 정보는 모두 예시입니다.
          <br />© 2026 TicketingLab. Portfolio demo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
