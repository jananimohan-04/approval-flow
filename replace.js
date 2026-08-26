import fs from 'fs';
const files = fs.readdirSync('src/routes').filter(f => f.endsWith('.tsx')).map(f => 'src/routes/' + f);
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    if (content.includes('if (!user) return null;')) {
        content = content.replace(/if \(\!user\) return null;/g, 'if (!user) return <Navigate to="/" replace />;');

        // Check if Navigate is imported from @tanstack/react-router
        if (content.includes('@tanstack/react-router') && !content.includes('Navigate')) {
            content = content.replace(/import \{([^}]+)\} from ["']@tanstack\/react-router["'];/, 'import { $1, Navigate } from "@tanstack/react-router";');
        } else if (!content.includes('Navigate')) {
            content = "import { Navigate } from '@tanstack/react-router';\n" + content;
        }

        fs.writeFileSync(f, content);
    }
});
