import React from 'react';
import styled from 'styled-components';
import { Monitor, Tablet, Laptop, Home } from 'lucide-react';

const Wrapper = styled.div`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  background: linear-gradient(160deg, #1d2752 0%, #212c59 55%, #2f3c7a 100%);
  font-family: 'Montserrat', sans-serif;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
`;

const DeviceIconsWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const IconBadge = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: ${props => props.$accent || 'rgba(255, 255, 255, 0.18)'};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
`;

const Title = styled.h1`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.9rem 0;
  line-height: 1.3;
`;

const Message = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.98rem;
  line-height: 1.6;
  margin: 0 0 1.6rem 0;
`;

const BackButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.08);
  color: #98c7ed;
  padding: 10px 14px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }
`;

const AdminDeviceRestriction = ({ onBackHome, isLoading = false }) => {
  return (
    <Wrapper>
      <Card>
        <DeviceIconsWrap>
          <IconBadge $accent="rgba(91, 134, 229, 0.9)">
            <Monitor size={20} />
          </IconBadge>
          <IconBadge $accent="rgba(176, 141, 87, 0.95)">
            <Tablet size={20} />
          </IconBadge>
          <IconBadge $accent="rgba(152, 199, 237, 0.9)">
            <Laptop size={20} />
          </IconBadge>
        </DeviceIconsWrap>

        <Title>Admin access is restricted on mobile phones</Title>
        <Message>
          This admin dashboard cannot be accessed on Android or iPhone screens, even when &ldquo;Desktop site&rdquo; is turned on in the browser.
          <br />
          <br />
          Please sign in using a tablet, laptop, or desktop computer.
        </Message>

        <BackButton type="button" onClick={onBackHome} disabled={isLoading}>
          <Home size={16} />
          {isLoading ? 'Returning...' : 'Back to Nomu Cafe'}
        </BackButton>
      </Card>
    </Wrapper>
  );
};

export default AdminDeviceRestriction;
