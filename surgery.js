var groupId = '1000201';
var missings = [
{"key":"100020109","text":{"name":"카프카","text":"얼마나 기억할까?"}},
{"key":"100020110","text":{"name":"카프카","text":"얼마나 기억할까?"}},
{"key":"100020111","text":{"name":"은랑","text":"적어도 네 이름은 기억할 거야"}},
{"key":"100020112","text":{"name":"카프카","text":"……"}},
{"key":"100020114","text":{"name":"카프카","text":"여기? 우주정거장인데, 그게 뭐가 중요해"}},
{"key":"100020116","text":{"name":"카프카","text":"다행이야, 내 이름은 기억하고 있네"}},
{"key":"100020117","text":{"name":"은랑","text":"……"}},
{"key":"100020119","text":{"name":"카프카","text":"날 기억할 거라고 하지 않았어?"}},
{"key":"100020120","text":{"name":"은랑","text":"네 생각만큼 네가 중요하지 않을 수도?"}},
{"key":"100020121","text":{"name":"카프카","text":"<color=#dbc291ff>잘 들어</color>, 지금은 머릿속이 뒤죽박죽 할 거야. 네가 누군지, 왜 여기 있는 건지, 뭘 해야 하는지도 모르겠고 내가 낯익은 것 같으면서도 믿을만한 사람인지 모를 테지——"}},
{"key":"100020122","text":{"name":"카프카","text":"——그래도 괜찮아. 중요한 건 널 이 우주정거장 에 두고 난 이만 가봐야 한다는 거야. 그러니까 지금부턴 과거를 생각한다거나 자신을 의심할 필요 없어"}},
{"key":"100020123","text":{"name":"카프카","text":"<color=#dbc291ff>들어봐</color>, 앞으로 넌 수많은 위 험과 끔찍한 곤경에 처하겠지만, 아름다운 일들도 마주할 거야. 가족 같은 동료를 만나서 상상치도 못한 모험을 시작할 거고……"}},
{"key":"100020124","text":{"name":"카프카","text":"또 여행이 끝나면 널 괴롭혔던 수 수께끼는 모두 풀리겠지"}},
{"key":"100020125","text":{"name":"카프카","text":"이게 바로 엘리오께서 예견하시고 네가 다다를 미래란다…. 맘에 들어?"}},
{"key":"100020127","text":{"name":"카프카","text":"그래야 지"}},
{"key":"100020128","text":{"name":"카프카","text":"<color=#dbc291ff>잘 듣고</color> 이 순간의 감정을 기억해. 방향만 마음속에 간직한다면 이야기 속 결말에 도달할 수 있을 테니까"}},
{"key":"100020129","text":{"name":"카프카","text":"난 네 이런 점이 맘에 들더라~"}},
{"key":"100020131","text":{"name":"카프카","text":"<color=#dbc291ff>들어봐</color>, 엘리오께서 미래를 내다보실 순 있지만, 네 선택엔 간섭할 수 없으시거든"}},
{"key":"100020132","text":{"name":"카프카","text":"네 의지로 결말에 도달해 봐, 난 네 이런 점이 맘에 들더라~"}},
{"key":"100020134","text":{"name":"카프카","text":"다음 지역, 준비된 미래를 위 해 길을 닦아놔야지"}},
{"key":"100020135","text":{"name":"카프카","text":"수를 놓는 것 같이 우린 한 번에 금실 하나밖에 엮을 수 없지만, 결국엔 아름다운 그림이 될 거란다"}},
{"key":"100020136","text":{"name":"은랑","text":"얼마나 더 걸려? 각본대로라면 {RUBY_B#「개척」의 여행자}은하열차{RUBY_E#} 사람들이 곧 온다고. 그들과 마주치면 안 돼"}},
{"key":"100020137","text":{"name":"카프카","text":"알았어, 은랑. 잠깐, 조금만 더"}},
{"key":"100020138","text":{"name":"카프카","text":"시간이 다 돼서 가봐야겠네…. <color=#dbc291ff>잘 들어</color>, 누군가 널 곧 찾을 테니 안심하고 그들을 따라가. 넌 나 말고 어떤 것도 기억하지 못할 거야"}},
{"key":"100020142","text":{"name":"카프카","text":"선택의 기회가 주어지면 후회할 짓은 하지 말렴……"}},
{"key":"100020143","text":{"name":"카프카","text":"그것도 좋은 대답이야"}}
]
var parsed = [
[
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010901.playable"},
  {
    "type":"PlayOptionTalk",
    "list":[
      {"TalkSentenceID":100020113,"isContinue":true,"text":{"text":"여… 기가… 어디지?"}},
      {"TalkSentenceID":100020115,"isContinue":true,"text":{"text":"카프…카?"}},
      {"TalkSentenceID":100020118,"isContinue":true,"text":{"text":"…당신은… 누구?"}}
    ]
  }
],
// -> ~ | 113  ~  115  ~  118  ->  ~ 112 |
[
  {"type":"WaitCustomString","value":"TalkSentence_100020113"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010902.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020121"}],
// 113 ~ 121 ->
[
  {"type":"WaitCustomString","value":"TalkSentence_100020115"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010903.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020121"}],
// 115 ~ 121 -> 
[
  {"type":"WaitCustomString","value":"TalkSentence_100020118"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010904.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020121"}],
// 118 ~ 121 -> 
[
  {"type":"WaitCustomString","value":"TalkSentence_100020121"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010905.playable"},
  {
    "type":"PlayOptionTalk",
    "list":[
      {"TalkSentenceID":100020126,"isContinue":true,"text":{"text":"대충… 맘에 들어요"}},
      {"TalkSentenceID":100020130,"isContinue":true,"text":{"text":"맘에 안 들어요…"}},
      {"TalkSentenceID":100020133,"isContinue":true,"text":{"text":"어디 가는데요…?"}}
    ]
  }
],
// -> 121 ~ | 126  ~  130  ~  133
[
  {"type":"WaitCustomString","value":"TalkSentence_100020126"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010906.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020136"}],
// -> 126 ~ 136 -> 126 <= < 130
[
  {"type":"WaitCustomString","value":"TalkSentence_100020130"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010907.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020136"}],
// -> 130 ~ 136 -> 130 <=  < 133
[
  {"type":"WaitCustomString","value":"TalkSentence_100020133"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010908.playable"},
  {"type":"TriggerCustomString","value":"TalkSentence_100020136"}],
// -> 133 ~ 136 -> 133 <=  < 136
[
  {"type":"WaitCustomString","value":"TalkSentence_100020136"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010909.playable"},
  {
    "type":"PlayOptionTalk",
    "list":[
      {"TalkSentenceID":100020139,"isContinue":true,"text":{"text":"시, 싫어요…"}},
      {"TalkSentenceID":100020140,"isContinue":true,"text":{"text":"안 돼요…"}},
      {"TalkSentenceID":100020141,"isContinue":true,"text":{"text":"카프…카…"}}
    ]
  }
],
// -> 136 ~ | 139  ~   140   ~   141
[
  {"type":"WaitCustomString","value":"TalkSentence_100020139"},
  {"type":"ComplexTalk","name":"Story/Mission/1000101/Story10001010910.playable"}]
// -> 139 ~ null -> 142 ~ 
];

const getMissingsBetween = (min, max) => missings.filter(({ key }) => min <= key && (max === undefined || key < max));
const getId = d => d.replace('TalkSentence_', '')
console.log(
// getMissingsBetween(groupId + 21, groupId + 33)
);


function parseParsed(parsed) {
  // context
  const results = []; 
  const sor = missings.map(({ key }) => key).sort();
  let from = sor[0];
  let to = null;
  let options = null;
  let sortedOptions = null;
  let maxOptions = null;
  let optionCounts = 0;

  // 'Initial', 'ComplexTalk', 'PlayOptionTalk', 'WaitCustomString', 'TriggerCustomString', 'End'
  let status = 'Initial';

  console.log('시작');
  const flatten = parsed.flatMap(_ => _);
  for (const element of flatten) {
    switch (element.type) {
      case 'PlayOptionTalk': {
        console.log('옵션이다');
        sortedOptions = element.list.map(({ TalkSentenceID }) => TalkSentenceID).sort();
        to = sortedOptions[0];
        maxOptions = sortedOptions.at(-1);
        console.log(from, '에서부터 ', to, '까지 넣는다');
        const mis = getMissingsBetween(from, to);
        if (mis.length) {
          results.push(mis);
        }
        console.log('옵션 객체를 만든다');
        options = element.list.reduce((map, { TalkSentenceID, text, isContinue }) => ({
          ...map,
          [TalkSentenceID]: [{ key: TalkSentenceID, text, isContinue }],
        }), {});
        optionCounts = element.list.length;
        break;
      }
      case 'WaitCustomString': {
        from = getId(element.value);
        console.log(from, '부터');
        break;
      }
      case 'ComplexTalk': { break; }
      case 'TriggerCustomString': {
        if (optionCounts === 0) {
          console.log('뭔가 이상함');
          return;
        }
        optionCounts -= 1;
        to = getId(element.value);
        // set options
        sortedOptions.filter(op => op > from);
        const myTo = sortedOptions.find(op => op < to && op > from) ?? to;
        console.log(myTo, '까지');
        const mis = getMissingsBetween(from, myTo);
        if (mis.length) {
          options[from].push(...mis);
        }
        if (optionCounts === 0) {
          // push options
          results.push(options);
          options = null;
        }
        break;
      }
    }
    status = element.type;
  }
  if (status === 'ComplexTalk') {
    const myFrom = Math.max(maxOptions.toString(), to.toString())
    // to 를 당겨서 끝까지를 추가
    results.push(options);
    results.push(getMissingsBetween(myFrom));
  }

  return results;
}

console.log(JSON.stringify(parseParsed(parsed), undefined, 2));
