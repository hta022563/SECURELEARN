import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.language || 'vi';

  return (
    <Dropdown align="end">
      <Dropdown.Toggle 
        variant="light" 
        id="dropdown-language" 
        className="d-flex align-items-center justify-content-center rounded-circle border-0 bg-light bg-opacity-75"
        style={{ width: '40px', height: '40px' }}
      >
        {/* Biểu tượng đa ngôn ngữ giống hình minh họa */}
        <i className="bi bi-translate fs-5 text-dark"></i>
      </Dropdown.Toggle>

      <Dropdown.Menu className="shadow-sm border-0 rounded-4 mt-2 p-2" style={{ minWidth: '150px' }}>
        <Dropdown.Item 
          onClick={() => changeLanguage('en')}
          className="rounded-3 d-flex align-items-center gap-2 py-2"
        >
          <span style={{ width: '16px' }}>
            {currentLang === 'en' && <i className="bi bi-check2"></i>}
          </span>
          <span>English</span>
        </Dropdown.Item>

        <Dropdown.Item 
          onClick={() => changeLanguage('vi')}
          className="rounded-3 d-flex align-items-center gap-2 py-2"
        >
          <span style={{ width: '16px' }}>
            {currentLang === 'vi' && <i className="bi bi-check2"></i>}
          </span>
          <span>Tiếng Việt</span>
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}
