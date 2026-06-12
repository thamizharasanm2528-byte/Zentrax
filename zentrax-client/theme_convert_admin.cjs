const fs = require('fs');
const files = [
    'd:/LLK/zentrax-client/src/pages/Admin/AdminOverview.jsx',
    'd:/LLK/zentrax-client/src/pages/Admin/AdminUsers.jsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let code = fs.readFileSync(file, 'utf8');

    // Backgrounds & Borders
    code = code.replace(/bg-\[\#0d1117\]/g, 'bg-slate-50');
    code = code.replace(/bg-\[\#161b22\]/g, 'bg-white');
    code = code.replace(/bg-\[\#1a1f26\]/g, 'bg-slate-100');
    code = code.replace(/bg-gray-800/g, 'bg-slate-100');
    code = code.replace(/bg-gray-900/g, 'bg-slate-50');
    code = code.replace(/border-gray-800/g, 'border-slate-200');
    code = code.replace(/border-gray-700/g, 'border-slate-200');
    code = code.replace(/border-white\/5/g, 'border-slate-200');
    code = code.replace(/border-white\/10/g, 'border-slate-200');
    code = code.replace(/bg-white\/5/g, 'bg-slate-100');
    
    // Text
    code = code.replace(/text-white/g, 'text-slate-900');
    code = code.replace(/text-gray-100/g, 'text-slate-900');
    code = code.replace(/text-gray-200/g, 'text-slate-800');
    code = code.replace(/text-gray-300/g, 'text-slate-700');
    code = code.replace(/text-gray-400/g, 'text-slate-500');
    code = code.replace(/text-gray-500/g, 'text-slate-500');
    code = code.replace(/text-gray-600/g, 'text-slate-400');
    code = code.replace(/text-\[\#94A3B8\]/g, 'text-slate-500');
    
    // Accents (Emerald -> Indigo)
    code = code.replace(/text-emerald-400/g, 'text-indigo-600');
    code = code.replace(/text-emerald-500/g, 'text-indigo-600');
    code = code.replace(/bg-emerald-600/g, 'bg-indigo-600');
    code = code.replace(/bg-emerald-500/g, 'bg-indigo-500');
    code = code.replace(/border-emerald-500/g, 'border-indigo-500');
    code = code.replace(/shadow-emerald-900/g, 'shadow-indigo-200');
    code = code.replace(/to-emerald-500/g, 'to-indigo-500');
    code = code.replace(/#00E08A/g, '#4F46E5');
    
    fs.writeFileSync(file, code);
    console.log('Updated ' + file);
});
