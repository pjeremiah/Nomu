import React, { useEffect, useMemo, useState } from 'react';
import Pagination from 'react-bootstrap/Pagination';
import { FaTimes } from 'react-icons/fa';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import axios from 'axios';
import ForHomePageLocationImage from '../utils/Images/Home/ForHomePageLocation.jpg';
import Navbar from '../components/Navbar';

  const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
  const categories = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];
  const itemsPerPage = 12;

  // Styled Components
  const MenuContainer = styled.div`
    font-family: 'Montserrat', sans-serif;
  `;

  const HeroSection = styled.section`
    position: relative;
    height: 50vh;
    overflow: hidden;
    animation: fadeIn 1s ease forwards;

    @media (max-width: 1200px) {
      height: 45vh;
    }

    @media (max-width: 768px) {
      height: 40vh;
    }

    @media (max-width: 480px) {
      height: 35vh;
    }
  `;

  const HeroImage = styled.img`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 1;
  `;

  const HeroOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    background: rgba(0, 0, 0, 0.55);
    color: #f5f5f5;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 0 20px;
    z-index: 2;
    font-family: 'Montserrat', sans-serif;

    h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 10px;
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
    }

    p {
      font-size: 1.2rem;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
    }

    @media (max-width: 1200px) {
      padding: 0 15px;

      h1 {
        font-size: 2.5rem;
        margin-bottom: 8px;
      }

      p {
        font-size: 1.1rem;
      }
    }

    @media (max-width: 768px) {
      h1 {
        font-size: 2.5rem;
      }
      
      p {
        font-size: 1rem;
      }
    }

    @media (max-width: 480px) {
      padding: 0 10px;

      h1 {
        font-size: 2rem;
        margin-bottom: 6px;
      }

      p {
        font-size: 0.9rem;
      }
    }
  `;

  const MenuContent = styled.div`
    display: flex;
    min-height: 100vh;
    background: ${props => props.theme.bgLight};
    position: relative;
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 20px;

    @media (max-width: 1200px) {
      padding: 0 15px;
    }

    @media (min-width: 1025px) {
      flex-direction: row;
    }

    @media (max-width: 1024px) {
      flex-direction: column;
      padding: 0 15px;
    }

    @media (max-width: 480px) {
      padding: 0 10px;
    }
  `;

  const PaginationWrapper = styled.div`
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: transparent;
    padding: 10px 20px;
    z-index: 10;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const MenuSidebar = styled.aside`
    width: 250px;
    background: ${props => props.theme.bgLight};
    padding: 40px 20px;

    @media (min-width: 1025px) {
      width: 250px;
      background: ${props => props.theme.bgLight};
      padding: 40px 20px;
    }

    @media (max-width: 1200px) {
      width: 220px;
      padding: 30px 15px;
    }

    @media (max-width: 1024px) {
      width: 100%;
      padding: 0;
      background: transparent;
      margin-bottom: 0;
    }

    @media (max-width: 480px) {
      padding: 0;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: ${props => props.theme.brand};
      margin-bottom: 30px;
      text-align: center;

      @media (max-width: 768px) {
        font-size: 1.3rem;
        margin-top: 30px;
        margin-bottom: 25px;
        padding: 0 20px;
        text-align: left;
      }
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      @media (min-width: 1025px) {
        display: block;
      }

      @media (max-width: 1200px) {
        gap: 10px;
        padding: 15px 15px 25px 15px;
      }

      @media (max-width: 1024px) {
        display: flex;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 20px 20px 30px 20px;
        justify-content: flex-start;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        
        &::-webkit-scrollbar {
          display: none;
        }
      }

      @media (max-width: 480px) {
        gap: 6px;
        padding: 15px 15px 25px 15px;
      }
    }

    li {
      padding: 15px 20px;
      margin-bottom: 10px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.3s ease;
      font-weight: 500;
      color: ${props => props.theme.text_primary};
      background: transparent;
      border: none;
      box-shadow: none;

      &:hover {
        background: ${props => props.theme.brand};
        color: white;
        transform: translateX(5px);
      }

      &.active {
        background: ${props => props.theme.brand};
        color: white;
        font-weight: 600;
      }

      @media (min-width: 1025px) {
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        font-weight: 500;
        color: ${props => props.theme.text_primary};
        background: transparent;
        border: none;
        box-shadow: none;
        height: auto;
        display: block;
        text-align: left;
        text-transform: none;
        letter-spacing: normal;

        &:hover {
          background: ${props => props.theme.brand};
          color: white;
          transform: translateX(5px);
        }

        &.active {
          background: ${props => props.theme.brand};
          color: white;
          font-weight: 600;
        }
      }

      @media (max-width: 1200px) {
        padding: 14px 18px;
        font-size: 0.95rem;
        height: 48px;
      }

      @media (max-width: 1024px) {
        padding: 16px 20px;
        margin-bottom: 0;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 700;
        text-align: center;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 2px solid #b08d57;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        flex-shrink: 0;
        min-width: fit-content;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #b08d57;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
          background: #b08d57;
          color: white;
          border-color: #8a6a3a;
        }

        &.active {
          background: #b08d57;
          color: white;
          border-color: #9a7a4a;
          box-shadow: 0 8px 25px rgba(176, 141, 87, 0.3);
          transform: translateY(-1px);
        }
      }

      @media (max-width: 480px) {
        padding: 12px 16px;
        font-size: 0.9rem;
        height: 45px;
        letter-spacing: 0.3px;
      }
    }
  `;

  const MenuMain = styled.main`
    flex: 1;
    padding: 40px;
    padding-bottom: 100px; /* Add space for pagination */
    background: ${props => props.theme.bgLight};

    @media (max-width: 1200px) {
      padding: 30px;
      padding-bottom: 100px;
    }

    @media (max-width: 1024px) {
      padding: 20px;
      padding-bottom: 100px; /* Add space for pagination on mobile */
    }

    @media (max-width: 480px) {
      padding: 15px;
      padding-bottom: 100px;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: ${props => props.theme.brand};
      margin-bottom: 40px;
      text-align: left;

      @media (max-width: 1200px) {
        font-size: 2.2rem;
        margin-bottom: 30px;
      }

      @media (max-width: 1024px) {
        font-size: 2rem;
        margin-bottom: 25px;
      }

      @media (max-width: 480px) {
        font-size: 1.8rem;
        margin-bottom: 20px;
      }
    }
  `;

  const CategorySeparator = styled.hr`
    border: none;
    height: 2px;
    background: linear-gradient(90deg, #b08d57, #d4af37, #b08d57);
    margin: 30px 0 40px 0;
    border-radius: 1px;
  `;

  const CardGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 30px;
    margin-bottom: 40px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 25px;
    }

    @media (max-width: 1024px) {
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    @media (max-width: 480px) {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 25px;
    }
  `;

  const MenuCard = styled.div`
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    border: 1px solid #e9ecef;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    img {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }

    .card-content {
      padding: 20px;

      h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: ${props => props.theme.brand};
        margin-bottom: 10px;
      }

      .divider {
        height: 2px;
        background: linear-gradient(90deg, ${props => props.theme.brand}, ${props => props.theme.accent});
        border-radius: 1px;
      }
    }
  `;

  const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
    animation: fadeIn 0.3s ease-out;
    
    @media (max-width: 1200px) {
      padding: 15px;
    }
    
    @media (max-width: 1024px) {
      padding: 12px;
    }
    
    @media (max-width: 768px) {
      padding: 10px;
      align-items: center;
    }
    
    @media (max-width: 480px) {
      padding: 5px;
      align-items: center;
    }
  `;

  const ModalContent = styled.div`
    background: white;
    border-radius: 20px;
    max-width: 380px;
    width: 100%;
    max-height: 80vh;
    overflow: hidden;
    position: relative;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15), 0 10px 30px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    
    @media (max-width: 1400px) {
      max-width: 60vw;
      max-height: 80vh;
    }
    
    @media (max-width: 1200px) {
      max-width: 55vw;
      max-height: 80vh;
    }
    
    @media (max-width: 1024px) {
      max-width: 50vw;
      max-height: 80vh;
    }
    
    @media (max-width: 768px) {
      max-width: 95vw;
      max-height: 90vh;
      width: 100%;
      margin: 0 auto;
    }
    
    @media (max-width: 480px) {
      max-width: 98vw;
      max-height: 95vh;
      width: 100%;
      margin: 0 auto;
    }
  `;

  const CloseButton = styled.button`
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 255, 255, 0.9);
    color: ${props => props.theme.brand};
    border: 2px solid ${props => props.theme.brand};
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1001;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);

    &:hover {
      background: ${props => props.theme.brand};
      color: white;
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    @media (max-width: 768px) {
      top: 10px;
      right: 10px;
      width: 35px;
      height: 35px;
    }
    
    @media (max-width: 480px) {
      top: 8px;
      right: 8px;
      width: 32px;
      height: 32px;
    }
  `;

  const ModalImage = styled.div`
    width: 100%;
    height: 180px;
    overflow: hidden;
    border-radius: 20px 20px 0 0;
    flex-shrink: 0;
    position: relative;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    &:hover img {
      transform: scale(1.02);
    }
    
    @media (max-width: 1200px) {
      height: 150px;
    }
    
    @media (max-width: 1024px) {
      height: 140px;
    }
    
    @media (max-width: 768px) {
      height: 180px;
    }
    
    @media (max-width: 480px) {
      height: 160px;
    }
  `;

  const ModalDetails = styled.div`
    padding: 20px;
    text-align: center;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: linear-gradient(135deg, #ffffff 0%, #fafafa 100%);
    border-radius: 0 0 20px 20px;

    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: ${props => props.theme.brand};
      margin-bottom: 8px;
      flex-shrink: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .menu-modal-price {
      font-size: 1.2rem;
      font-weight: 600;
      color: ${props => props.theme.accent};
      margin-bottom: 12px;
      flex-shrink: 0;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .menu-modal-description-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: ${props => props.theme.text_primary};
      margin-bottom: 6px;
      text-align: left;
      flex-shrink: 0;
    }

    .menu-modal-description {
      font-size: 0.9rem;
      line-height: 1.4;
      color: ${props => props.theme.text_secondary};
      flex: 1;
      overflow-y: auto;
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-height: 150px;
      text-align: left;
      padding: 6px 0;
    }
    
    @media (max-width: 1200px) {
      padding: 25px;
      
      h2 {
        font-size: 1.8rem;
        margin-bottom: 14px;
      }
      
      .menu-modal-price {
        font-size: 1.4rem;
        margin-bottom: 18px;
      }
    }
    
    @media (max-width: 1024px) {
      padding: 22px;
      
      h2 {
        font-size: 1.7rem;
        margin-bottom: 13px;
      }
      
      .menu-modal-price {
        font-size: 1.35rem;
        margin-bottom: 16px;
      }
      
      .menu-modal-description-label {
        font-size: 0.95rem;
        margin-bottom: 7px;
      }
      
      .menu-modal-description {
        font-size: 0.95rem;
        line-height: 1.55;
      }
    }
    
    @media (max-width: 768px) {
      padding: 20px;
      
      h2 {
        font-size: 1.5rem;
        margin-bottom: 12px;
      }
      
      .menu-modal-price {
        font-size: 1.3rem;
        margin-bottom: 15px;
      }
      
      .menu-modal-description-label {
        font-size: 0.9rem;
        margin-bottom: 6px;
      }
      
      .menu-modal-description {
        font-size: 0.9rem;
        line-height: 1.5;
      }
    }
    
    @media (max-width: 480px) {
      padding: 15px;
      
      h2 {
        font-size: 1.3rem;
        margin-bottom: 10px;
      }
      
      .menu-modal-price {
        font-size: 1.2rem;
        margin-bottom: 12px;
      }
      
      .menu-modal-description-label {
        font-size: 0.85rem;
        margin-bottom: 5px;
      }
      
      .menu-modal-description {
        font-size: 0.85rem;
        line-height: 1.4;
      }
    }
  `;

  const Menu = () => {
    const theme = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('Donuts');
    const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [items, setItems] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (selectedItem) {
      // Store scroll position
      const scrollY = window.scrollY;
      
      // Apply immediate styles
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.classList.add('modal-open');
      
      // Prevent all scroll events
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Add event listeners
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('scroll', preventScroll, { passive: false });
      
      // Store for cleanup
      window.menuScrollPrevent = preventScroll;
      
    } else {
      // Restore scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('modal-open');
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY.replace('-', '')));
      }
      
      // Remove event listeners
      if (window.menuScrollPrevent) {
        document.removeEventListener('wheel', window.menuScrollPrevent);
        document.removeEventListener('touchmove', window.menuScrollPrevent);
        document.removeEventListener('scroll', window.menuScrollPrevent);
        delete window.menuScrollPrevent;
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('modal-open');
      
      if (window.menuScrollPrevent) {
        document.removeEventListener('wheel', window.menuScrollPrevent);
        document.removeEventListener('touchmove', window.menuScrollPrevent);
        document.removeEventListener('scroll', window.menuScrollPrevent);
        delete window.menuScrollPrevent;
      }
    };
  }, [selectedItem]);

      const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/menu/client`);
      setItems(res.data || []);
    } catch (err) {
      // eslint-disable-next-line no-console

    }
  };

    useEffect(() => {
      fetchItems();
      const interval = setInterval(fetchItems, 5000); 
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 50);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const filteredItems = useMemo(() => {
      const base = items.filter(i => i.category === selectedCategory);
      return base;
    }, [selectedCategory, items]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
    const paginatedItems = filteredItems.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const handlePageChange = (number) => {
      setCurrentPage(number);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleItemClick = (item) => {
      setSelectedItem(item);
    };

    const handleCloseModal = () => {
      setSelectedItem(null);
    };

    const imgUrl = (url) => `${API_BASE}${url}`;

    return (
      <>
        <Navbar isScrolled={isScrolled} />
        <MenuContainer>
          {/* Hero Section */}
          <HeroSection>
            <HeroImage src={ForHomePageLocationImage} alt="Menu background" />
            <HeroOverlay>
              <h1>MENU</h1>
              <p>Discover our carefully crafted drinks, pastries, and pizzas</p>
            </HeroOverlay>
          </HeroSection>

          {/* Menu Content */}
          <MenuContent>
            <MenuSidebar>
              <h2>CATEGORIES</h2>
              <ul>
                {categories.map((category, index) => (
                  <li
                    key={index}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }}
                    className={selectedCategory === category ? 'active' : ''}
                  >
                    {category}
                  </li>
                ))}
              </ul>
            </MenuSidebar>

            <MenuMain>
            <h1>{selectedCategory}</h1>
            <CategorySeparator />
            <CardGrid>
              {paginatedItems.map((item) => (
                <MenuCard 
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                >
                  {item.imageUrl && <img src={imgUrl(item.imageUrl)} alt={item.name} />}
                  <div className="card-content">
                    <h3>{item.name}</h3>
                    <div className="divider" />
                  </div>
                </MenuCard>
              ))}
            </CardGrid>
          </MenuMain>

          <PaginationWrapper>
            <Pagination>
            {[...Array(totalPages).keys()].map(number => (
              <Pagination.Item
                key={number + 1}
                active={number + 1 === currentPage}
                onClick={() => handlePageChange(number + 1)}
              >
                {number + 1}
              </Pagination.Item>
            ))}
          </Pagination>
          </PaginationWrapper>
          </MenuContent>
        </MenuContainer>

        {selectedItem && (
          <ModalOverlay onClick={() => setSelectedItem(null)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <CloseButton onClick={handleCloseModal}>
                <FaTimes />
              </CloseButton>
              <ModalImage>
                {selectedItem.imageUrl && (
                  <img src={imgUrl(selectedItem.imageUrl)} alt={selectedItem.name} />
                )}
              </ModalImage>
              <ModalDetails>
                <h2>{selectedItem.name}</h2>
                <p className="menu-modal-price">
                  {selectedItem.category === 'Drinks' && selectedItem.secondPrice 
                    ? `₱${Number(selectedItem.price).toFixed(0).toLocaleString()}/${Number(selectedItem.secondPrice).toFixed(0).toLocaleString()}`
                    : `₱${Number(selectedItem.price).toFixed(0).toLocaleString()}`
                  }
                </p>
                {selectedItem.description && (
                <>
                  <p className="menu-modal-description-label">Description:</p>
                  <p className="menu-modal-description">{selectedItem.description}</p>
                </>
                )}
              </ModalDetails>
            </ModalContent>
          </ModalOverlay>
        )}
      </>
    );
  };

  export default Menu;
