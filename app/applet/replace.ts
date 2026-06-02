import * as fs from 'fs';

const content = fs.readFileSync('src/components/VectorMemoryPanel.tsx', 'utf-8');

const start_marker = "// 1. Vectorize Current Chapter (có hỗ trợ xoay vòng khóa tự động khi quá tải)";
const end_marker = "  // 3. Search Semantic Memory (Cosine Similarity)";

const start_idx = content.indexOf(start_marker);
const end_idx = content.indexOf(end_marker);

if (start_idx === -1 || end_idx === -1) {
    console.log("Markers not found!");
    process.exit(1);
}

const replacement = fs.readFileSync('replacement.ts', 'utf-8');

const new_content = content.substring(0, start_idx) + replacement + "\n" + content.substring(end_idx);

fs.writeFileSync('src/components/VectorMemoryPanel.tsx', new_content, 'utf-8');

console.log("Replaced successfully!");
