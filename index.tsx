import { OpenAI } from 'openai'
import fastDiff from 'fast-diff'
import sflow from 'sflow'
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
const kuroshiro = new Kuroshiro();
const dictPath = !globalThis?.window ? undefined : 'https://cdn.jsdelivr.net/npm/kuromoji@latest/dict/';
const analyzer = new KuromojiAnalyzer({ dictPath });
await kuroshiro.init(analyzer);

// 1. call chatgpt api using 4o modal to generate html with <ruby> tags for furigana
// 2. take the response as stream and decode it to a plain text/html stream, append to latest result
// 3. use fast-diff to compare latest-result with original html.
// 4. merge them use response first and original second
// 5. 
if (import.meta.main) {
    const input = `<p>ロート製薬は、子どもの花粉症に関するアンケート調査の結果を公表した。花粉症で目がかゆい小学生の4人に1人が「授業など勉強に集中できない」と訴える一方、子どもが日常生活で感じる影響を親は十分に把握できていない状況も明らかになった。
</p>
<p>【あなたの地域は？】スギ、ヒノキ…花粉が本格飛来する時期</p>
`
    const result = await kuroshiro.convert(input)
    console.log(input)
    console.log('')
    const merged = mergeOriginalWithFurigana(input, result);
    console.log(merged)
    // 
    console.log(result)

    //     const expectedOutput = `
    // <p>ロート製薬<ruby>せいやく<rt>せいやく</rt></ruby>は、子どもの花粉症<ruby>しょう<rt>しょう</rt></ruby>に関<ruby>かん<rt>かん</rt></ruby>するアンケート調査<ruby>ちょうさ<rt>ちょうさ</rt></ruby>の結果<ruby>けっか<rt>けっか</rt></ruby>を公表<ruby>こうひょう<rt>こうひょう</rt></ruby>した。花粉症<ruby>しょう<rt>しょう</rt></ruby>で目<ruby>め<rt>め</rt></ruby>がかゆい小学生<ruby>しょうがくせい<rt>しょうがくせい</rt></ruby>の4人<ruby>にん<rt>にん</rt></ruby>に1人<ruby>にん<rt>にん</rt></ruby>が「授業<ruby>じゅぎょう<rt>じゅぎょう</rt></ruby>など勉強<ruby>べんきょう<rt>べんきょう</rt></ruby>に集中<ruby>しゅうちゅう<rt>しゅうちゅう</rt></ruby>できない」と訴<ruby>うった<rt>うった</rt></ruby>える一方<ruby>いっぽう<rt>いっぽう</rt></ruby>、子<ruby>こ<rt>こ</rt></ruby>どもが日常生活<ruby>にちじょうせいかつ<rt>にちじょうせいかつ</rt></ruby>で感じる影響<ruby>えいきょう<rt>えいきょう</rt></ruby>を親<ruby>おや<rt>おや</rt></ruby>は十分<ruby>じゅうぶん<rt>じゅうぶん</rt></ruby>に把握<ruby>はあく<rt>はあく</rt></ruby>できていない状況<ruby>じょうきょう<rt>じょうきょう</rt></ruby>も明<ruby>あき<rt>あき</rt></ruby>らかになった。</p>
    // <p>【あなたの地域<ruby>ちいき<rt>ちいき</rt></ruby>は？】スギ、ヒノキ…花粉<ruby>かふん<rt>かふん</rt></ruby>が本格<ruby>ほんかく<rt>ほんかく</rt></ruby>飛来<ruby>ひらい<rt>ひらい</rt></ruby>する時期<ruby>じき<rt>じき</rt></ruby></p>
    // `
    //     const CURRENTOUTPUT = expectedOutput.slice(0, 100)
    //     const DIFF = fastDiff(input, CURRENTOUTPUT)
    //     const MERGED = DIFF.map(([type, value], i, a) => {
    //         if (type === fastDiff.INSERT) {
    //             return value
    //         } else if (type === fastDiff.DELETE) {
    //             return '-'
    //         } else {
    //             return value
    //         }
    //     }).join('')

    // console.clear()
    // console.log('Input:', input)
    // console.log('')
    // console.log('Expected Output:', expectedOutput)
    // console.log('')
    // console.log('Current Output:', CURRENTOUTPUT)
    // console.log('')
    // console.log('Diff:', DIFF)
    // console.log('')
    // console.log('Input:', input)
    // console.log('')
    // console.log('Merged Output:', MERGED)
    // console.log('')


    // const resp = new OpenAI().chat.completions.create({
    //     model: 'gpt-4o',
    //     messages: [
    //         {
    //             role: 'system',
    //             content: 'You are a helpful assistant that adds furigana to Japanese text. No explain, output only valid html with <ruby> tags for furigana.',
    //         },
    //         {
    //             role: 'user',
    //             content: `Add furigana to the following html:\n\n${input}`
    //         }
    //     ],
    //     stream: true,
    // })
    // await sflow(await resp).map(e => e.choices[0].delta.content).filter().reduce((acc, cur) => acc + cur, '')
    //     .map(e => e.replace(/^```html/, '').replace(/```$/, ''))
    //     .forEach(async () => await Bun.sleep(200))
    //     .forEach((output) => {
    //         console.clear();
    //         console.log(input)
    //         console.log('')
    //         console.log(output)
    //         console.log('')
    //         const diff = fastDiff(input, output)
    //         const merged = diff.map(([type, value]) => {
    //             if (type === fastDiff.INSERT) {
    //                 return `<ruby>${value}<rt>${value}</rt></ruby>`
    //             } else if (type === fastDiff.DELETE) {
    //                 return value
    //             } else {
    //                 return value
    //             }
    //         }).join('')
    //         console.log(merged)
    //     })
    //     .run()
}

function mergeOriginalWithFurigana(input: string, result: any) {
    const diff = fastDiff(input, result);
    const merged = diff.map(([type, value], i) => {
        const last = diff[i - 1];
        if (type === fastDiff.INSERT && last?.[0] === fastDiff.DELETE) {
            const lastValue = last[1];
            return `<ruby>${lastValue}<rt>${value}</rt></ruby>`;
        } else if (type === fastDiff.DELETE) {
            return '';
        } else {
            return value;
        }
    }).join('');
    return merged;
}

