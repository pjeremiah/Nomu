import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import EnhancedGenderDropdown from './components/EnhancedGenderDropdown';
import EnhancedEmploymentDropdown from './components/EnhancedEmploymentDropdown';

// Styled Components
const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  background: #f8f9fa;
  overflow: hidden; /* Prevent scrolling */
`;

const AccountContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 110px 20px 40px 20px; /* 70px navbar height + 40px spacing */
  display: grid;
  gap: 18px;
  font-family: 'Montserrat', sans-serif;
  min-height: calc(100vh - 110px); /* Prevent scrolling by setting min-height */
  box-sizing: border-box;
`;

const Section = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  padding: 40px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    color: ${props => props.theme.brand};
    font-size: 2rem;
    font-weight: 700;
  }
`;

const Divider = styled.div`
  height: 2px;
  background: linear-gradient(90deg, ${props => props.theme.brand}, ${props => props.theme.accent});
  margin-bottom: 20px;
  border-radius: 1px;
`;

const ErrorMessage = styled.div`
  color: #dc3545;
  background: #f8d7da;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  border: 1px solid #f5c6cb;
`;

const LoadingMessage = styled.p`
  text-align: center;
  color: ${props => props.theme.text_secondary};
  font-size: 1.1rem;
`;

const ProfileGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, 220px) 1fr;
  gap: 30px;
  align-items: start;

  @media (max-width: 1024px) {
    grid-template-columns: 180px 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 1600px) {
    grid-template-columns: 260px 1fr;
  }
`;

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;

  @media (max-width: 768px) {
    align-items: center;
  }
`;

const AvatarContainer = styled.div`
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  background: #e1e1e1;
  border: 3px solid ${props => props.theme.brand};
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .no-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #98A3B3;
    font-size: 0.9rem;
  }
`;

const FileInput = styled.label`
  background: white;
  color: ${props => props.theme.brand};
  border: 2px solid ${props => props.theme.brand};
  padding: 10px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  text-align: center;
  transition: all 0.3s ease;
  display: inline-block;

  &:hover {
    background: ${props => props.theme.brand};
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);
  }

  input {
    display: none;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 20px;
  align-content: start;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FieldLabel = styled.div`
  font-weight: 600;
  color: ${props => props.theme.brand};
  margin-bottom: 8px;
  font-size: 1rem;
`;

const FieldValue = styled.p`
  color: ${props => props.theme.text_primary};
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  font-size: 1rem;
  font-family: 'Montserrat', sans-serif;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.brand};
    box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1);
  }

  &:disabled {
    background-color: #e9ecef;
    cursor: not-allowed;
    border-color: #ced4da;
  }
`;

const FieldSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  font-size: 1rem;
  font-family: 'Montserrat', sans-serif;
  background: white;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.brand};
    box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
  font-family: 'Montserrat', sans-serif;

  ${props => props.variant === 'primary' ? `
    background: white;
    color: ${props.theme.brand};
    border: 2px solid ${props.theme.brand};
    box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1);

    &:hover:not(:disabled) {
      background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgMTJMMTAgMTdMMTkgOCIgc3Ryb2tlPSIjMjEyYzU5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K') no-repeat center center, linear-gradient(135deg, #212c59 0%, #2a3a6b 100%);
      background-size: 20px 20px, cover;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(33, 44, 89, 0.4);
    }
  ` : props.variant === 'goldish' ? `
    background: white;
    color: #b08d57;
    border: 2px solid #b08d57;
    box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1);

    &:hover:not(:disabled) {
      background: #f8f6f0;
      border-color: #b08d57;
      color: #b08d57;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3);
    }
  ` : `
    background: white;
    color: ${props.theme.brand};
    border: 2px solid ${props.theme.brand};

    &:hover:not(:disabled) {
      background: ${props.theme.brand};
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);
    }
  `}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SignInPrompt = styled.div`
  max-width: 520px;
  margin: 40px auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
  padding: 40px;
  text-align: center;

  h2 {
    color: ${props => props.theme.brand};
    margin-bottom: 15px;
    font-size: 1.8rem;
    font-weight: 700;
  }

  p {
    color: ${props => props.theme.text_secondary};
    font-size: 1.1rem;
  }
`;

const AccountSettings = () => {
  const theme = useTheme();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', email: '', birthday: '', gender: '', employmentStatus: 'Prefer not to say' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [originalProfilePicture, setOriginalProfilePicture] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';

  const token = useMemo(() => localStorage.getItem('token') || sessionStorage.getItem('token'), []);

  // Ensure birthday is always in YYYY-MM-DD format
  useEffect(() => {
    if (form.birthday && form.birthday.includes('/')) {
      // Convert from MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
      const date = new Date(form.birthday);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0];
        setForm(prev => ({ ...prev, birthday: formattedDate }));
      }
    }
  }, [form.birthday]);

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load profile');
        setProfile(data);
        setForm({ fullName: data.fullName || '', username: data.username || '', email: data.email || '', birthday: data.birthday || '', gender: data.gender || '', employmentStatus: data.employmentStatus || 'Prefer not to say' });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchMe();
  }, [token, API_URL]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    
    // Store the original profile picture if not already stored
    if (!originalProfilePicture) {
      setOriginalProfilePicture(profile?.profilePicture || null);
    }
    
    // Store the selected file and create a preview
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfile((p) => ({ ...p, profilePicture: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // First, upload profile picture if a file was selected
      let profilePicturePath = profile?.profilePicture;
      if (selectedFile) {
        setAvatarUploading(true);
        try {
          const formData = new FormData();
          formData.append('avatar', selectedFile);
          const res = await fetch(`${API_URL}/api/auth/me/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to upload image');
          profilePicturePath = data.profilePicture;
        } catch (e) {
          setError(e.message);
          return;
        } finally {
          setAvatarUploading(false);
        }
      }

      // Then update profile fields
      const { fullName, username, birthday, gender, employmentStatus } = form;
      const payload = { fullName, username, birthday, gender, employmentStatus };
      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');
      setProfile((p) => ({ 
        ...p, 
        fullName: data.fullName || p.fullName,
        username: data.username || p.username,
        email: data.email || p.email,
        birthday: data.birthday || p.birthday,
        gender: data.gender || p.gender,
        employmentStatus: data.employmentStatus || p.employmentStatus,
        profilePicture: profilePicturePath || p.profilePicture
      }));
      // Update form with the new data
      const newFormData = { 
        fullName: data.fullName || '', 
        username: data.username || '', 
        email: data.email || '', 
        birthday: data.birthday || '', 
        gender: data.gender || '', 
        employmentStatus: data.employmentStatus || 'Prefer not to say' 
      };
      setForm(newFormData);
      setIsEditing(false);
      
      // Update local user with the new profile picture
      const localUserPrev = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      const updatedUser = {
        id: data.id,
        email: data.email,
        username: data.username,
        fullName: data.fullName,
        birthday: data.birthday,
        gender: data.gender,
        employmentStatus: data.employmentStatus,
        profilePicture: profilePicturePath || localUserPrev.profilePicture || ''
      };
      
      // Update the storage where the token is stored
      if (localStorage.getItem('token')) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else if (sessionStorage.getItem('token')) {
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
      window.dispatchEvent(new Event('authChange'));
      
      // Reset file selection
      setSelectedFile(null);
      setOriginalProfilePicture(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <SignInPrompt>
        <h2>Account Settings</h2>
        <p>Please sign in to view your account.</p>
      </SignInPrompt>
    );
  }

  return (
    <PageWrapper>
      <AccountContainer>
        <Section>
        <Header>
          <h2>Account Settings</h2>
          {!loading && profile && (
            !isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
            ) : (
              <ButtonGroup>
                <Button variant="primary" disabled={saving} onClick={handleSave}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="goldish" disabled={saving} onClick={() => { 
                  setIsEditing(false); 
                  setForm({ 
                    fullName: profile.fullName, 
                    username: profile.username, 
                    email: profile.email, 
                    birthday: profile.birthday, 
                    gender: profile.gender, 
                    employmentStatus: profile.employmentStatus || 'Prefer not to say' 
                  }); 
                  // Revert profile picture to original
                  if (originalProfilePicture !== null) {
                    setProfile((p) => ({ ...p, profilePicture: originalProfilePicture }));
                  }
                  // Reset file selection
                  setSelectedFile(null);
                  setOriginalProfilePicture(null);
                }}>
                  Cancel
                </Button>
              </ButtonGroup>
            )
          )}
        </Header>
        <Divider />
        {error && (
          <ErrorMessage>{error}</ErrorMessage>
        )}
        {loading ? (
          <LoadingMessage>Loading...</LoadingMessage>
        ) : profile ? (
          <ProfileGrid>
            <AvatarSection>
              <AvatarContainer>
                {profile.profilePicture ? (
                  <img 
                    src={profile.profilePicture.startsWith('data:') 
                      ? profile.profilePicture 
                      : profile.profilePicture.startsWith('/api/')
                      ? `${API_URL}${profile.profilePicture}`
                      : `${API_URL}${profile.profilePicture}`} 
                    alt="Profile" 
                  />
                ) : (
                  <div className="no-image">No Image</div>
                )}
              </AvatarContainer>
              {isEditing && (
                <FileInput>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
                  {avatarUploading ? 'Uploading...' : 'Change Picture'}
                </FileInput>
              )}
            </AvatarSection>
            <FormGrid>
              {!isEditing ? (
                <>
                  <FieldGroup>
                    <FieldLabel>Email:</FieldLabel>
                    <FieldValue>{profile.email}</FieldValue>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Full Name:</FieldLabel>
                    <FieldValue>{profile.fullName}</FieldValue>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Username:</FieldLabel>
                    <FieldValue>{profile.username}</FieldValue>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Birthday:</FieldLabel>
                    <FieldValue>{profile.birthday}</FieldValue>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Gender:</FieldLabel>
                    <FieldValue>{profile.gender}</FieldValue>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Employment Status:</FieldLabel>
                    <FieldValue>{profile.employmentStatus || 'Prefer not to say'}</FieldValue>
                  </FieldGroup>
                </>
              ) : (
                <>
                  <FieldGroup>
                    <FieldLabel>Email</FieldLabel>
                    <FieldInput 
                      type="email" 
                      value={form.email} 
                      readOnly 
                      disabled
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Full Name</FieldLabel>
                    <FieldInput 
                      value={form.fullName} 
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })} 
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Username</FieldLabel>
                    <FieldInput 
                      value={form.username} 
                      onChange={(e) => setForm({ ...form, username: e.target.value })} 
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Birthday</FieldLabel>
                    <FieldInput 
                      type="date" 
                      value={form.birthday} 
                      onChange={(e) => {
                        const value = e.target.value;
                        const date = new Date(value);
                        const formattedValue = !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : value;
                        setForm({ ...form, birthday: formattedValue });
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Gender</FieldLabel>
                    <EnhancedGenderDropdown
                      value={form.gender}
                      onChange={(value) => setForm({ ...form, gender: value })}
                      disabled={loading}
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Employment Status</FieldLabel>
                    <EnhancedEmploymentDropdown
                      value={form.employmentStatus}
                      onChange={(value) => setForm({ ...form, employmentStatus: value })}
                      disabled={loading}
                    />
                  </FieldGroup>
                </>
              )}
            </FormGrid>
          </ProfileGrid>
        ) : (
          <LoadingMessage>No profile data.</LoadingMessage>
        )}
      </Section>
    </AccountContainer>
    </PageWrapper>
  );
};

export default AccountSettings; 