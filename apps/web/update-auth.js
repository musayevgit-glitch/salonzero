const fs = require('fs');

const loginFormPath = 'app/[locale]/login/LoginForm.tsx';
let loginForm = fs.readFileSync(loginFormPath, 'utf8');

loginForm = loginForm.replace(`import { useRouter, useSearchParams } from 'next/navigation';`, `import { useSearchParams } from 'next/navigation';\nimport { useRouter } from '../../../../i18n/navigation';\nimport { useTranslations } from 'next-intl';`);

loginForm = loginForm.replace(`export function LoginForm() {`, `export function LoginForm() {\n  const t = useTranslations('auth');\n  const tc = useTranslations('common');`);

loginForm = loginForm.replace(`'Eksklüziv gözəllik təcrübəsi'`, `tc('tagline')`);
loginForm = loginForm.replace(`'Daxil olun'`, `t('loginTitle')`);
loginForm = loginForm.replace(`'E-poçt'`, `t('email')`);
loginForm = loginForm.replace(`'Şifrə'`, `t('password')`);
loginForm = loginForm.replace(`'Gözləyin...'`, `tc('loading')`);
loginForm = loginForm.replace(`'Daxil ol'`, `t('loginBtn')`);
loginForm = loginForm.replace(`'Şifrəni unutdunuz?'`, `t('forgotPassword')`);
loginForm = loginForm.replace(`'Hesabınız yoxdur?'`, `t('noAccount')`);
loginForm = loginForm.replace(`'Qeydiyyat'`, `t('register')`);
loginForm = loginForm.replace(`>Daxil olun<`, `>{t('loginTitle')}<`);
loginForm = loginForm.replace(`>Eksklüziv gözəllik təcrübəsi<`, `>{tc('tagline')}<`);
loginForm = loginForm.replace(`>E-poçt<`, `>{t('email')}<`);
loginForm = loginForm.replace(`>Şifrə</label>`, `>{t('password')}</label>`);
loginForm = loginForm.replace(`>Şifrəni unutdunuz?</a>`, `>{t('forgotPassword')}</a>`);
loginForm = loginForm.replace(`Hesabınız yoxdur?`, `{t('noAccount')}`);
loginForm = loginForm.replace(`>Qeydiyyat</a>`, `>{t('register')}</a>`);
loginForm = loginForm.replace(`{loading ? 'Gözləyin...' : 'Daxil ol'}`, `{loading ? tc('loading') : t('loginBtn')}`);
loginForm = loginForm.replace(`'Something went wrong. Please try again.'`, `tc('error')`);

fs.writeFileSync(loginFormPath, loginForm);
console.log('Login form updated');
