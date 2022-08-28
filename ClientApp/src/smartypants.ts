/**
    Based on https://github.com/othree/smartypants.js/blob/master/smartypants.ts

    BSD 3-Clause License

    Copyright (c) 2016, othree
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

    * Neither the name of the copyright holder nor the names of its
    contributors may be used to endorse or promote products derived from
    this software without specific prior written permission.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
    AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

type token = [string, string];

const tags_to_skip = /<(\/?)(?:pre|code|kbd|script|math)[^>]*>/i;

/**
 * @param text text to be parsed
 * @param attr value of the smart_quotes="" attribute
 */
const SmartyPants = (
    text: string = "",
    attr: string | number = "1"
): string => {
    var do_quotes: number = 1;
    var do_backticks: number = 1;
    var do_dashes: number = 1;
    var do_ellipses: number = 1;
    var convert_quot: number = 0;

    if (typeof attr === "number") {
        attr = attr.toString();
    } else {
        attr = attr.replace(/\s/g, "");
    }

    /**
     * Parse attributes:
     * 0 : do nothing
     * 1 : set all
     * 2 : set all, using old school en- and em- dash shortcuts
     * 3 : set all, using inverted old school en and em- dash shortcuts
     *
     * q : quotes
     * b : backtick quotes (``double'' only)
     * B : backtick quotes (``double'' and `single')
     * d : dashes
     * D : old school dashes
     * i : inverted old school dashes
     * e : ellipses
     * w : convert &quot; entities to " for Dreamweaver users
     */

    if (attr === "0") {
        // Do nothing
        return text;
    } else if (attr === "1") {
        // Do everything, turn all options on.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 1;
        do_ellipses = 1;
    } else if (attr === "2") {
        // Do everything, turn all options on, use old school dash shorthand.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 2;
        do_ellipses = 1;
    } else if (attr === "3") {
        // Do everything, turn all options on, use inverted old school dash shorthand.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 3;
        do_ellipses = 1;
    } else {
        for (let i = 0; i < attr.length; i++) {
            let c = attr[i];
            if (c === "q") {
                do_quotes = 1;
            }
            if (c === "b") {
                do_backticks = 1;
            }
            if (c === "B") {
                do_backticks = 2;
            }
            if (c === "d") {
                do_dashes = 1;
            }
            if (c === "D") {
                do_dashes = 2;
            }
            if (c === "i") {
                do_dashes = 3;
            }
            if (c === "e") {
                do_ellipses = 1;
            }
            if (c === "w") {
                convert_quot = 1;
            }
        }
    }

    var tokens: Array<token> = _tokenize(text);
    var result: string = "";
    /**
     * Keep track of when we're inside <pre> or <code> tags.
     */
    var in_pre: number = 0;
    /**
     * This is a cheat, used to get some context
     * for one-character tokens that consist of
     * just a quote char. What we do is remember
     * the last character of the previous text
     * token, to use as context to curl single-
     * character quote tokens correctly.
     */
    var prev_token_last_char: string = "";

    for (let i = 0; i < tokens.length; i++) {
        let cur_token = tokens[i];
        if (cur_token[0] === "tag") {
            result = result + cur_token[1];
            let matched = tags_to_skip.exec(cur_token[1]);
            if (matched) {
                if (matched[1] === "/") {
                    in_pre = 0;
                } else {
                    in_pre = 1;
                }
            }
        } else {
            let t: string = cur_token[1];
            let last_char: string = t.substring(t.length - 1, t.length); // Remember last char of this token before processing.
            if (!in_pre) {
                t = ProcessEscapes(t);

                if (convert_quot) {
                    t = t.replace(/$quot;/g, '"');
                }

                if (do_dashes) {
                    if (do_dashes === 1) {
                        t = EducateDashes(t);
                    }
                    if (do_dashes === 2) {
                        t = EducateDashesOldSchool(t);
                    }
                    if (do_dashes === 3) {
                        t = EducateDashesOldSchoolInverted(t);
                    }
                }

                if (do_ellipses) {
                    t = EducateEllipses(t);
                }

                // Note: backticks need to be processed before quotes.
                if (do_backticks) {
                    t = EducateBackticks(t);
                    if (do_backticks === 2) {
                        t = EducateSingleBackticks(t);
                    }
                }

                if (do_quotes) {
                    if (t === "'") {
                        // Special case: single-character ' token
                        if (/\S/.test(prev_token_last_char)) {
                            t = "’";
                        } else {
                            t = "‘";
                        }
                    } else if (t === '"') {
                        // Special case: single-character " token
                        if (/\S/.test(prev_token_last_char)) {
                            t = "”";
                        } else {
                            t = "“";
                        }
                    } else {
                        // Normal case:
                        t = EducateQuotes(t);
                    }
                }
            }
            prev_token_last_char = last_char;
            result = result + t;
        }
    }

    return result;
};

/**
 * @param {string} str String
 * @return {string} The string, with "educated" curly quote HTML entities.
 *
 * Example input:  "Isn't this fun?"
 * Example output: “Isn’t this fun?”
 */
const EducateQuotes = (str: string): string => {
    /**
     * Make our own "punctuation" character class, because the POSIX-style
     * [:PUNCT:] is only available in Perl 5.6 or later:
     *
     * JavaScript don't have punctuation class neither.
     */
    var punct_class = "[!\"#$%'()*+,-./:;<=>?@[\\]^_`{|}~]"; // eslint-disable-line no-useless-escape

    /**
     * Special case if the very first character is a quote
     * followed by punctuation at a non-word-break. Close the quotes by brute force:
     */
    str = str.replace(new RegExp(`^'(?=${punct_class}\\B)`), "’"); // eslint-disable-line no-useless-escape
    str = str.replace(new RegExp(`^"(?=${punct_class}\\B)`), "”"); // eslint-disable-line no-useless-escape

    /**
     * Special case for double sets of quotes, e.g.:
     *   <p>He said, "'Quoted' words in a larger quote."</p>
     */
    str = str.replace(/"'(?=\w)/, "“‘");
    str = str.replace(/'"(?=\w)/, "‘“");

    /**
     * Special case for decade abbreviations (the '80s):
     */
    str = str.replace(/'(?=\d\d)/, "’");

    var close_class = "[^\\ \\t\\r\\n\\[\\{\\(\\-]"; // eslint-disable-line no-useless-escape
    var not_close_class = "[\\ \\t\\r\\n\\[\\{\\(\\-]"; // eslint-disable-line no-useless-escape
    var dec_dashes = "–|—";
    /**
     * Get most opening single quotes:
     * s {
     *     (
     *         \s          |   # a whitespace char, or
     *         &nbsp;      |   # a non-breaking space entity, or
     *         --          |   # dashes, or
     *         &[mn]dash;  |   # named dash entities
     *         $dec_dashes |   # or decimal entities
     *         &\#x201[34];    # or hex
     *     )
     *     '                   # the quote
     *     (?=\w)              # followed by a word character
     * } {$1‘}xg;
     */
    str = str.replace(
        new RegExp(
            `(\\s|&nbsp;|--|&[mn]dash;|${dec_dashes}|&#x201[34])'(?=\\w)`,
            "g"
        ),
        "$1‘"
    ); // eslint-disable-line no-useless-escape

    /**
     * Single closing quotes:
     * s {
     *     ($close_class)?
     *     '
     *     (?(1)|          # If $1 captured, then do nothing;
     *       (?=\s | s\b)  # otherwise, positive lookahead for a whitespace
     *     )               # char or an 's' at a word ending position. This
     *                     # is a special case to handle something like:
     *                     # "<i>Custer</i>'s Last Stand."
     * } {$1’}xgi;
     */

    str = str.replace(new RegExp(`(${close_class})'`, "g"), "$1’"); // eslint-disable-line no-useless-escape
    str = str.replace(
        new RegExp(`(${not_close_class}?)'(?=\\s|s\\b)`, "g"),
        "$1’"
    ); // eslint-disable-line no-useless-escape

    /**
     * Any remaining single quotes should be opening ones:
     */
    str = str.replace(/'/g, "‘");

    /**
     * Get most opening double quotes:
     * s {
     *     (
     *         \s          |   # a whitespace char, or
     *         &nbsp;      |   # a non-breaking space entity, or
     *         --          |   # dashes, or
     *         &[mn]dash;  |   # named dash entities
     *         $dec_dashes |   # or decimal entities
     *         &\#x201[34];    # or hex
     *     )
     *     "                   # the quote
     *     (?=\w)              # followed by a word character
     * } {$1“}xg;
     */
    str = str.replace(
        new RegExp(
            `(\\s|&nbsp;|--|&[mn]dash;|${dec_dashes}|&#x201[34])"(?=\\w)`,
            "g"
        ),
        "$1“"
    ); // eslint-disable-line no-useless-escape

    /**
     * Double closing quotes:
     * s {
     *     ($close_class)?
     *     "
     *     (?(1)|(?=\s))   # If $1 captured, then do nothing;
     *                        # if not, then make sure the next char is whitespace.
     * } {$1”}xg;
     */
    str = str.replace(new RegExp(`(${close_class})"`, "g"), "$1”"); // eslint-disable-line no-useless-escape
    str = str.replace(new RegExp(`(${not_close_class}?)"(?=\\s)`, "g"), "$1”"); // eslint-disable-line no-useless-escape

    /**
     * Any remaining quotes should be opening ones.
     */
    str = str.replace(/"/g, "“");

    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with ``backticks'' -style double quotes
 *                  translated into HTML curly quote entities.
 *
 * Example input:  ``Isn't this fun?''
 * Example output: “Isn't this fun?”
 */
const EducateBackticks = (str: string): string => {
    str = str.replace(/``/g, "“");
    str = str.replace(/''/g, "”");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with `backticks' -style single quotes
 *                  translated into HTML curly quote entities.
 *
 * Example input:  `Isn't this fun?'
 * Example output: ‘Isn’t this fun?’
 */
const EducateSingleBackticks = (str: string): string => {
    str = str.replace(/`/g, "‘");
    str = str.replace(/'/g, "’");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with each instance of "--" translated to
 *                  an em-dash HTML entity.
 */
const EducateDashes = (str: string): string => {
    str = str.replace(/--/g, "—");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with each instance of "--" translated to
 *                  an en-dash HTML entity, and each "---" translated to
 *                  an em-dash HTML entity.
 */
const EducateDashesOldSchool = (str: string): string => {
    str = str.replace(/---/g, "—");
    str = str.replace(/--/g, "–");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with each instance of "--" translated to
 *                  an em-dash HTML entity, and each "---" translated to
 *                  an en-dash HTML entity. Two reasons why: First, unlike the
 *                  en- and em-dash syntax supported by
 *                  EducateDashesOldSchool(), it's compatible with existing
 *                  entries written before SmartyPants 1.1, back when "--" was
 *                  only used for em-dashes.  Second, em-dashes are more
 *                  common than en-dashes, and so it sort of makes sense that
 *                  the shortcut should be shorter to type. (Thanks to Aaron
 *                  Swartz for the idea.)
 */
const EducateDashesOldSchoolInverted = (str: string): string => {
    str = str.replace(/---/g, "–");
    str = str.replace(/--/g, "—");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with each instance of "..." translated to
 *                  an ellipsis HTML entity. Also converts the case where
 *                  there are spaces between the dots.
 *
 * Example input:  Huh...?
 * Example output: Huh…?
 */
const EducateEllipses = (str: string): string => {
    str = str.replace(/\.\.\./g, "…");
    str = str.replace(/\. \. \./g, "…");
    return str;
};

/**
 * @param {string} str String
 * @return {string} The string, with each SmartyPants HTML entity translated to
 *                  UTF-8 characters.
 *
 * Example input:  “Hello ’ world.”
 * Example output: "Hello — world."
 */
const EducateEntities = (text: string, attr: string | number = "1"): string => {
    var do_quotes: number = 1;
    var do_backticks: number = 1;
    var do_dashes: number = 1;
    var do_ellipses: number = 1;

    if (typeof attr === "number") {
        attr = attr.toString();
    } else {
        attr = attr.replace(/\s/g, "");
    }

    if (attr === "0") {
        // Do nothing
        return text;
    } else if (attr === "1") {
        // Do everything, turn all options on.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 1;
        do_ellipses = 1;
    } else if (attr === "2") {
        // Do everything, turn all options on, use old school dash shorthand.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 3;
        do_ellipses = 1;
    } else if (attr === "3") {
        // Do everything, turn all options on, use inverted old school dash shorthand.
        do_quotes = 1;
        do_backticks = 1;
        do_dashes = 3;
        do_ellipses = 1;
    } else {
        for (let i = 0; i < attr.length; i++) {
            let c = attr[i];
            if (c === "q") {
                do_quotes = 1;
            }
            if (c === "b") {
                do_backticks = 1;
            }
            if (c === "B") {
                do_backticks = 2;
            }
            if (c === "d") {
                do_dashes = 1;
            }
            if (c === "D") {
                do_dashes = 2;
            }
            if (c === "i") {
                do_dashes = 3;
            }
            if (c === "e") {
                do_ellipses = 1;
            }
        }
    }

    if (do_dashes) {
        text = text.replace(/–/g, "\u2013"); // en-dash
        text = text.replace(/—/g, "\u2014"); // em-dash
    }

    if (do_quotes || do_backticks) {
        text = text.replace(/‘/g, "\u2018"); // open single quote
        text = text.replace(/’/g, "\u2019"); // close single quote

        text = text.replace(/“/g, "\u201c"); // open double quote
        text = text.replace(/”/g, "\u201d"); // close double quote
    }

    if (do_ellipses) {
        text = text.replace(/…/g, "\u2026"); // ellipsis
    }

    return text;
};

/**
 * @param {string} str String
 * @return {string} string, with after processing the following backslash
 *                  escape sequences. This is useful if you want to force a "dumb"
 *                  quote or other character to appear.
 *
 *                  Escape  Value
 *                  ------  -----
 *                  \\      \
 *                  \"      "
 *                  \'      '
 *                  \.      .
 *                  \-      -
 *                  \`      `
 *
 */
const ProcessEscapes = (str: string): string => {
    str = str.replace(/\\\\/g, "\\");
    str = str.replace(/\\"/g, '"');
    str = str.replace(/\\'/g, "'");
    str = str.replace(/\\\./g, ".");
    str = str.replace(/\\-/g, "-");
    str = str.replace(/\\`/g, "`");
    return str;
};

/**
 * @param {string} str String containing HTML markup.
 * @return {Array<token>} Reference to an array of the tokens comprising the input
 *                        string. Each token is either a tag (possibly with nested,
 *                        tags contained therein, such as <a href="<MTFoo>">, or a
 *                        run of text between tags. Each element of the array is a
 *                        two-element array; the first is either 'tag' or 'text';
 *                        the second is the actual value.
 *
 * Based on the _tokenize() subroutine from Brad Choate's MTRegex plugin.
 *     <http://www.bradchoate.com/past/mtregex.php>
 */
const _tokenize = (str: string): Array<token> => {
    var pos = 0;
    var len = str.length;
    var tokens = [];

    var match = /<!--[\s\S]*?-->|<\?.*?\?>|<[^>]*>/g;

    var matched = null;

    while ((matched = match.exec(str))) {
        // eslint-disable-line no-cond-assign
        if (pos < matched.index) {
            let t: token = ["text", str.substring(pos, matched.index)];
            tokens.push(t);
        }
        let t: token = ["tag", matched.toString()];
        tokens.push(t);

        pos = match.lastIndex;
    }
    if (pos < len) {
        let t: token = ["text", str.substring(pos, len)];
        tokens.push(t);
    }

    return tokens;
};

export { SmartyPants as smartypants };
export default SmartyPants;
