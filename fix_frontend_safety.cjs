const fs = require('fs');
const file = 'src/components/KikokoNovelScreen.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /if \(chunk\.text\) \{(\s*)fullTextRef\.current \+= chunk\.text;/g;
const replacement = `if (chunk.text) {$1const prevLen = fullTextRef.current.length;$1fullTextRef.current += chunk.text;$1if (fullTextRef.current.length < prevLen) throw new Error("Chapter content was overwritten instead of appended.");`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Successfully added overwriting safety check in KikokoNovelScreen.tsx");
} else {
    console.log("Regex did not match in KikokoNovelScreen.tsx");
}

const errorRegex = /if \(fullTextRef\.current\.length < 1000 && !isApiDoneRef\.current\) \{(\s*)throw new Error\("Proxy generated content but frontend received empty\/too short content\."\);/g;
const newErrorReplacement = `if (fullTextRef.current.length < 1000 && !isApiDoneRef.current) {$1throw new Error("Stream was truncated: frontend received only partial content.");`;

if (errorRegex.test(code)) {
    code = code.replace(errorRegex, newErrorReplacement);
    fs.writeFileSync(file, code);
    console.log("Successfully replaced error message in KikokoNovelScreen.tsx");
} else {
    console.log("Error Regex did not match in KikokoNovelScreen.tsx");
}
