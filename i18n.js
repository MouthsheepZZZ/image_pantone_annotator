// Internationalization Manager
class I18n {
    constructor() {
        this.currentLang = 'en';
        this.translations = {};
        this.defaultLang = 'en';
    }

    async init(defaultLang = 'en') {
        this.defaultLang = defaultLang;
        
        // Check if user has a saved language preference
        const savedLang = localStorage.getItem('pantone_lang') || defaultLang;
        
        // Load both language files
        await Promise.all([
            this.loadLanguage('en'),
            this.loadLanguage('zh')
        ]);
        
        // Set the initial language
        await this.setLanguage(savedLang);
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang}.json`);
            }
            this.translations[lang] = await response.json();
            console.log(`✓ Loaded ${lang} translations`);
        } catch (error) {
            console.error(`Error loading ${lang} translations:`, error);
        }
    }

    async setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language ${lang} not loaded, falling back to ${this.defaultLang}`);
            lang = this.defaultLang;
        }
        
        this.currentLang = lang;
        localStorage.setItem('pantone_lang', lang);
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Update all translated elements
        this.updatePageTranslations();
        
        // Update language switcher button states
        this.updateLanguageSwitcher();
        
        // Trigger custom event for other components to react
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    updatePageTranslations() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            // Skip if translation not found (returns key)
            if (translation === key) return;
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Update elements with data-i18n-html attribute
        document.querySelectorAll('[data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            const translation = this.t(key);
            
            // Skip if translation not found
            if (translation === key) return;
            
            element.innerHTML = translation;
        });

        // Update elements with data-i18n-placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            
            // Skip if translation not found
            if (translation === key) return;
            
            element.placeholder = translation;
        });

        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            
            // Skip if translation not found
            if (translation === key) return;
            
            element.title = translation;
        });
    }

    updateLanguageSwitcher() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    t(key, params = {}) {
        // Check if translations are loaded
        if (!this.translations[this.currentLang]) {
            // Return key if translations not loaded yet
            return key;
        }
        
        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                // Only warn after translations are loaded
                if (Object.keys(this.translations).length > 0) {
                    console.warn(`Translation key not found: ${key}`);
                }
                return key;
            }
        }
        
        if (typeof value === 'string') {
            // Replace placeholders like {name} with actual values
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }
        
        return value || key;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

// Create global i18n instance
window.i18n = new I18n();
