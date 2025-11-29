// Bug Injection Algorithm for Debug the Monolith
// Automatically injects various types of bugs into perfect code

function injectBugs(code, bugCount) {
    const lines = code.split('\n');
    const bugs = [];
    const buggedLines = new Set();

    const bugTypes = [
        { type: 'Syntax Error', weight: 20, apply: injectSyntaxError },
        { type: 'Logic Error', weight: 30, apply: injectLogicError },
        { type: 'Typo', weight: 30, apply: injectTypo },
        { type: 'Off-by-One', weight: 20, apply: injectOffByOne }
    ];

    // Inject bugs
    for (let i = 0; i < bugCount; i++) {
        let attempts = 0;
        let success = false;

        while (!success && attempts < 50) {
            attempts++;

            // Pick random line that hasn't been bugged yet
            const lineIndex = Math.floor(Math.random() * lines.length);
            if (buggedLines.has(lineIndex) || lines[lineIndex].trim() === '') {
                continue;
            }

            // Pick random bug type based on weights
            const bugType = weightedRandom(bugTypes);
            const result = bugType.apply(lines[lineIndex], lineIndex, lines);

            if (result.success) {
                lines[lineIndex] = result.buggyLine;
                buggedLines.add(lineIndex);
                bugs.push({
                    type: bugType.type,
                    line: lineIndex + 1,
                    original: result.original,
                    bugged: result.buggyLine
                });
                success = true;
            }
        }
    }

    return {
        buggyCode: lines.join('\n'),
        bugs: bugs
    };
}

function weightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
        if (random < item.weight) return item;
        random -= item.weight;
    }
    return items[0];
}

// === BUG INJECTION FUNCTIONS ===

function injectSyntaxError(line, index, allLines) {
    const original = line;
    let buggyLine = line;

    // Remove semicolons
    if (line.includes(';') && Math.random() < 0.4) {
        buggyLine = line.replace(/;/g, '');
        return { success: true, original, buggyLine };
    }

    // Mismatched brackets
    if (line.includes('{') && Math.random() < 0.3) {
        buggyLine = line.replace('{', '(');
        return { success: true, original, buggyLine };
    }

    if (line.includes('}') && Math.random() < 0.3) {
        buggyLine = line.replace('}', ')');
        return { success: true, original, buggyLine };
    }

    // Missing quotes
    const quoteMatch = line.match(/['"`]([^'"`]+)['"`]/);
    if (quoteMatch && Math.random() < 0.4) {
        buggyLine = line.replace(quoteMatch[0], quoteMatch[1]);
        return { success: true, original, buggyLine };
    }

    // Missing parentheses
    if (line.includes('(') && Math.random() < 0.3) {
        buggyLine = line.replace('(', '');
        return { success: true, original, buggyLine };
    }

    return { success: false };
}

function injectLogicError(line, index, allLines) {
    const original = line;
    let buggyLine = line;

    // Change comparison operators
    if (line.includes('==') && Math.random() < 0.5) {
        buggyLine = line.replace('==', '!=');
        return { success: true, original, buggyLine };
    }

    if (line.includes('!=') && Math.random() < 0.5) {
        buggyLine = line.replace('!=', '==');
        return { success: true, original, buggyLine };
    }

    if (line.includes('<') && !line.includes('<=') && Math.random() < 0.4) {
        buggyLine = line.replace('<', '>');
        return { success: true, original, buggyLine };
    }

    if (line.includes('>') && !line.includes('>=') && Math.random() < 0.4) {
        buggyLine = line.replace('>', '<');
        return { success: true, original, buggyLine };
    }

    // Change arithmetic operators
    if (line.includes(' + ') && Math.random() < 0.4) {
        buggyLine = line.replace(' + ', ' - ');
        return { success: true, original, buggyLine };
    }

    if (line.includes(' - ') && Math.random() < 0.4) {
        buggyLine = line.replace(' - ', ' + ');
        return { success: true, original, buggyLine };
    }

    if (line.includes(' * ') && Math.random() < 0.3) {
        buggyLine = line.replace(' * ', ' / ');
        return { success: true, original, buggyLine };
    }

    // Change && to ||
    if (line.includes('&&') && Math.random() < 0.5) {
        buggyLine = line.replace('&&', '||');
        return { success: true, original, buggyLine };
    }

    if (line.includes('||') && Math.random() < 0.5) {
        buggyLine = line.replace('||', '&&');
        return { success: true, original, buggyLine };
    }

    return { success: false };
}

function injectTypo(line, index, allLines) {
    const original = line;
    let buggyLine = line;

    const keywords = [
        { correct: 'function', wrong: 'functon' },
        { correct: 'return', wrong: 'retrun' },
        { correct: 'const', wrong: 'cosnt' },
        { correct: 'let', wrong: 'elt' },
        { correct: 'if', wrong: 'fi' },
        { correct: 'else', wrong: 'esle' },
        { correct: 'for', wrong: 'fro' },
        { correct: 'while', wrong: 'whlie' },
        { correct: 'true', wrong: 'ture' },
        { correct: 'false', wrong: 'flase' },
        { correct: 'null', wrong: 'nul' },
        { correct: 'undefined', wrong: 'undefind' },
        { correct: 'length', wrong: 'lenght' },
        { correct: 'console', wrong: 'consoel' },
        { correct: 'document', wrong: 'documnet' }
    ];

    for (const keyword of keywords) {
        if (line.includes(keyword.correct)) {
            buggyLine = line.replace(keyword.correct, keyword.wrong);
            return { success: true, original, buggyLine };
        }
    }

    // Random character swap
    const words = line.match(/\b[a-zA-Z]{4,}\b/g);
    if (words && words.length > 0) {
        const word = words[Math.floor(Math.random() * words.length)];
        const chars = word.split('');
        if (chars.length > 2) {
            const i = Math.floor(Math.random() * (chars.length - 1));
            [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
            const typoWord = chars.join('');
            buggyLine = line.replace(word, typoWord);
            return { success: true, original, buggyLine };
        }
    }

    return { success: false };
}

function injectOffByOne(line, index, allLines) {
    const original = line;
    let buggyLine = line;

    // Array index errors
    if (line.includes('[i]') && Math.random() < 0.5) {
        buggyLine = line.replace('[i]', '[i+1]');
        return { success: true, original, buggyLine };
    }

    if (line.includes('[i+1]') && Math.random() < 0.5) {
        buggyLine = line.replace('[i+1]', '[i]');
        return { success: true, original, buggyLine };
    }

    // Loop conditions
    if (line.includes('< length') && Math.random() < 0.5) {
        buggyLine = line.replace('< length', '<= length');
        return { success: true, original, buggyLine };
    }

    if (line.includes('<= length') && Math.random() < 0.5) {
        buggyLine = line.replace('<= length', '< length');
        return { success: true, original, buggyLine };
    }

    // Increment/decrement
    if (line.includes('i++') && Math.random() < 0.3) {
        buggyLine = line.replace('i++', 'i--');
        return { success: true, original, buggyLine };
    }

    if (line.includes('i--') && Math.random() < 0.3) {
        buggyLine = line.replace('i--', 'i++');
        return { success: true, original, buggyLine };
    }

    // Number literals
    const numberMatch = line.match(/\b(\d+)\b/);
    if (numberMatch && Math.random() < 0.4) {
        const num = parseInt(numberMatch[1]);
        const newNum = Math.random() < 0.5 ? num + 1 : num - 1;
        buggyLine = line.replace(numberMatch[1], newNum.toString());
        return { success: true, original, buggyLine };
    }

    return { success: false };
}

// Code similarity comparison (for scoring)
function calculateSimilarity(code1, code2) {
    // Normalize code (remove extra whitespace, comments)
    const normalize = (code) => {
        return code
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*/g, '') // Remove line comments
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .toLowerCase();
    };

    const norm1 = normalize(code1);
    const norm2 = normalize(code2);

    // Exact match
    if (norm1 === norm2) return 100;

    // Levenshtein distance for partial match
    const distance = levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    const similarity = ((maxLen - distance) / maxLen) * 100;

    return Math.max(0, Math.round(similarity));
}

function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}
