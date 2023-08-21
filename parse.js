// file utils
const fs = require('fs');
const fsPromises = fs.promises;
const sep = require('path').sep;
const readJsonFile = path => JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));

// path utils
const currentPath = `.${sep}StarRailData${sep}`;
const rp = path => `${currentPath}${path}`;
const mainMissionMap = readJsonFile(rp('ExcelOutput/MainMission.json'));
const ConfigLevelMissionPath = rp('Config/Level/Mission');
const getMissionInfoPath = key => `${ConfigLevelMissionPath}${sep}${key}${sep}MissionInfo_${key}.json`;
const getTalksDirPath = key => `Config/Level/Mission${sep}${key}${sep}Talk`;
const getActsDirPath = key => `Config/Level/Mission${sep}${key}${sep}Act`;

/**
 * { [talkSentenceId: string]: string }
 */
const talkUsedMap = {};
const textMapRawHash = readJsonFile(rp('TextMap/TextMapKR.json'));
const TalkSentenceConfig = readJsonFile(rp('ExcelOutput/TalkSentenceConfig.json'));
const TalkSentenceConfigKeys = Object.keys(TalkSentenceConfig);
const t = hash => textMapRawHash[hash?.Hash ?? hash]; // hash
const tt = tk => {
  if (!TalkSentenceConfig[tk]) {
    return;
  }
  const { TextmapTalkSentenceName: name, TalkSentenceText: text } = TalkSentenceConfig[tk];
  talkUsedMap[tk] = 1;
  return { name: t(name), text: t(text) };
}
const getGroupTalkKeys = groupId => TalkSentenceConfigKeys.filter(key => key.startsWith(groupId) && key.length === 9);

// performance utils
const performanceMap = {
  A: readJsonFile(rp('ExcelOutput/PerformanceA.json')), // Act
  C: readJsonFile(rp('ExcelOutput/PerformanceC.json')), // Cutscene
  CG: readJsonFile(rp('ExcelOutput/PerformanceCG.json')),
  D: readJsonFile(rp('ExcelOutput/PerformanceD.json')), // ?
  DS: readJsonFile(rp('ExcelOutput/PerformanceDS.json')),
  E: readJsonFile(rp('ExcelOutput/PerformanceE.json')), // ?
  RecallData: readJsonFile(rp('ExcelOutput/PerformanceRecallData.json')),
  PlayVideo: readJsonFile(rp('ExcelOutput/PerformanceVideo.json')),
};
const VideoConfig = readJsonFile(rp('ExcelOutput/VideoConfig.json'));
const CutSceneConfig = readJsonFile(rp('ExcelOutput/CutSceneConfig.json'));


// utils
const getGroupId = ids => {
  const xor = Array.from(Array(9).keys())
    .find(i =>
      ids.map(id => Math.floor(id / Math.pow(10, i)))
        .every((id, _, [first]) => first === id)
    );
  return Math.floor(ids[0] / Math.pow(10, xor));
};

// global variables
const restTaskType = new Set();

// start to parse
const [key] = Object.keys(mainMissionMap); // TODO: loop
// const key = '1010101';
console.log(key);

const mission = mainMissionMap[key];
const MissionInfoPath = getMissionInfoPath(key);
const MissionInfo = readJsonFile(MissionInfoPath);
const { SubMissionList } = MissionInfo;

const list = [...SubMissionList];
const map = {};
const sortedSubMissionList = [];
let count = 0;
while (list.length > 0) {
  count += 1;
  const SubMission = list.shift();
  if (SubMission.TakeParamIntList === undefined || SubMission.TakeParamIntList.length === 0) { // 아무도 없으면
    map[SubMission.ID] = 1;
    sortedSubMissionList.push(SubMission);
  } else if (SubMission.TakeParamIntList.every(id => map[id] === 1)) { // 다 나갔으면
    map[SubMission.ID] = 1;
    sortedSubMissionList.push(SubMission);
  } else {
    list.push(SubMission); // 다음 기회에~
  }

  if (count > SubMissionList.length * (SubMissionList.length + 1) / 2) { // 망함
    console.log('뭔가 이상함');
    SubMissionList.forEach(SubMission => {
      console.log(SubMission.ID, ' ---> ', SubMission.TakeParamIntList);
    });
    break;
  }
}

const dialogs = [];

const checkPerformanceRead = {};
sortedSubMissionList.forEach(SubMission => {
  const { ID, MissionJsonPath } = SubMission;
  if (!MissionJsonPath) {
    return;
  }
  const MissionJson = readJsonFile(rp(MissionJsonPath));

  const dialog = parseSequenceObject(MissionJson);
  if (dialog.length) {
    dialogs.push({ ID, dialog });
  }
});

console.log(
  JSON.stringify(dialogs, undefined, 2)
);

// Items
const TalksDirPath = getTalksDirPath(key)
if (fs.existsSync(TalksDirPath)) {
  const others = [];

  const list = fs.readdirSync(TalksDirPath);
  list.map(filename => `${TalksDirPath}${sep}${filename}`).forEach(talkPath => {
    const talkJson = readJsonFile(rp(talkPath));

    const dialog = parseSequenceObject(talkJson);
    if (dialog.length) {
      others.push({ dialog });
    }
  });

  console.log(
    JSON.stringify(others, undefined, 2)
  );
}

// Acts
const ActsDirPath = getActsDirPath(key)
if (fs.existsSync(ActsDirPath)) {
  const others = [];

  const list = fs.readdirSync(ActsDirPath);
  list.map(filename => `${ActsDirPath}${sep}${filename}`).filter(s => !checkPerformanceRead[s]).forEach(actPath => {
    const actJson = readJsonFile(rp(actPath));

    const dialog = parseSequenceObject(actJson);
    if (dialog.length) {
      others.push({ dialog });
    }
  });

  console.log(
    JSON.stringify(others, undefined, 2)
  );
}

/**
 * SequenceObject::
 * MissionJson, Performance
 * @returns DialogSequence
 */
function parseSequenceObject({ OnInitSequece, OnStartSequece }) {
  const dialog = [];
  OnStartSequece.forEach(Sequence => {
    const parsed = parseTaskList(Sequence.TaskList);
    if (parsed.length) {
      dialog.push(parsed);
    }
  });
  return dialog;
}

function parseTaskList(TaskList) {
  return TaskList.map(Task => parseTask(Task)).filter(s => s);
}

function parseTask(Task) {
  const { $type: type } = Task;
  switch (type) {
    case 'RPG.GameCore.FinishPerformanceMission': {
      // console.log(`SubMission ${ID} 종료`);
      break;
    }
    case 'RPG.GameCore.TriggerPerformance': {
      const { PerformanceType, PerformanceID } = Task;
      const { PerformancePath } = performanceMap[PerformanceType][PerformanceID];
      const Performance = readJsonFile(rp(PerformancePath));

      checkPerformanceRead[PerformancePath] = 1; // check as read

      switch (PerformanceType) {
        case 'PlayVideo': {
          return {
            type: 'TriggerPerformance',
            PerformanceType,
            content: parseSequenceObject(Performance),
          };
        }
        case 'A': { // 자막 붙는 컷씬
          return {
            type: 'TriggerPerformance',
            PerformanceType,
            content: parseSequenceObject(Performance),
          };
        }
        case 'D': { // 심플 토크
          return {
            type: 'TriggerPerformance',
            PerformanceType,
            content: parseSequenceObject(Performance),
          };
        }
        case 'C': { // 인게임 컷씬 (나쁜 것)
          const parsed = parseSequenceObject(Performance);
          const flattened = parsed.flatMap(_ => _);
          const options = flattened.filter(obj => obj.type === 'PlayOptionTalk');

          // 만약 옵션 텍스트가 살아있다면 고칠 수도 있지 않을까?
          if (options.length === 0) {
            console.log('복구 불가', flattened);
            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parsed,
            };
          }

          const ids = options.flatMap(({ list }) => list.map(({ TalkSentenceID }) => TalkSentenceID)); // number[]
          const groupId = getGroupId(ids).toString();
          const missing = 9 - groupId.length;

          const missingRestTalkKeys = getGroupTalkKeys(groupId);
          const missingRestTalks = missingRestTalkKeys.filter(key => !talkUsedMap[key]).map(key => ({ key, text: tt(key) }));

          /* 구데기 코드 시작 */
          const getMissingsBetween = (min, max) => missingRestTalks.filter(({ key }) => min <= key && (max === undefined || key < max));
          const getId = d => d.replace('TalkSentence_', '')

                  const parseParsed = (parsed) => {
                    // context
                    const results = []; 
                    const sor = missingRestTalks.map(({ key }) => key).sort();
                    let from = sor[0];
                    let to = null;
                    let options = null;
                    let sortedOptions = null;
                    let maxOptions = null;
                    let optionCounts = 0;

                    // 'Initial', 'ComplexTalk', 'PlayOptionTalk', 'WaitCustomString', 'TriggerCustomString', 'End'
                    let status = 'Initial';

                    // console.log('시작');
                    const flatten = parsed.flatMap(_ => _);
                    for (const element of flatten) {
                      switch (element.type) {
                        case 'PlayOptionTalk': {
                          // console.log('옵션이다');
                          sortedOptions = element.list.map(({ TalkSentenceID }) => TalkSentenceID).sort();
                          to = sortedOptions[0];
                          maxOptions = sortedOptions.at(-1);
                          // console.log(from, '에서부터 ', to, '까지 넣는다');
                          const mis = getMissingsBetween(from, to);
                          if (mis.length) {
                            results.push(mis);
                          }
                          // console.log('옵션 객체를 만든다');
                          options = element.list.reduce((map, { TalkSentenceID, text, isContinue }) => ({
                            ...map,
                            [TalkSentenceID]: [{ key: TalkSentenceID, text, isContinue }],
                          }), {});
                          optionCounts = element.list.length;
                          break;
                        }
                        case 'WaitCustomString': {
                          from = getId(element.value);
                          // console.log(from, '부터');
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
                          // console.log(myTo, '까지');
                          const mis = getMissingsBetween(from, myTo);
                          if (mis.length) {
                            try {
                              options[from].push(...mis);
                            } catch (err) {
                              const optionKeys = Object.keys(options);
                              if (optionKeys.length === 1) {
                                options[optionKeys[0]].push(...mis);
                              } else {
                                throw err;
                              }
                            }
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
          /* 구데기 코드 끝 */

          return {
            type: 'TriggerPerformance',
            PerformanceType,
            content: parseParsed(parsed),
          };
        }
        case 'E': { // 얘넨 뭐지
          return {
            type: 'TriggerPerformance',
            PerformanceType,
            content: parseSequenceObject(Performance),
          };
        }
        default: {
          console.log('Unknown PerformanceType', PerformanceType, Task);
          break;
        }
      }
      break;
    }
    case 'RPG.GameCore.PlayVideo': {
      const { VideoID } = Task;
      if (!VideoConfig[VideoID]) {
        return;
      }
      const { CaptionPath } = VideoConfig[VideoID];
      const Caption = readJsonFile(rp(CaptionPath));
      const { CaptionList } = Caption;
      const captions = CaptionList.map(({ CaptionTextID }) => t(CaptionTextID));
      return {
        type: 'PlayVideo',
        VideoID,
        captions,
      };
    }
    case 'RPG.GameCore.TriggerBattle': {
      // 누구 누구랑 싸우는지 나옴
      // ExcelOutput/PlaneEvent.json
      // ExcelOutput/StageConfig.json
      break;
    }
    case 'RPG.GameCore.PlayMissionTalk': {
      const { SimpleTalkList } = Task;
      const speakings = SimpleTalkList.map(({ TalkSentenceID }) => tt(TalkSentenceID));
      return {
        type: 'PlayMissionTalk',
        speakings,
      };
    }
    case 'RPG.GameCore.PropSetupUITrigger': {
      const { ButtonCallback } = Task; 
      const returns = parseTaskList(ButtonCallback);
      return {
        type: 'PropSetupUITrigger',
        returns,
      };
    }
    case 'RPG.GameCore.TriggerCustomString': {
      const { CustomString: { Value } } = Task;
      return {
        type: 'TriggerCustomString',
        value: Value,
      };
    }
    case 'RPG.GameCore.WaitCustomString': {
      const { CustomString: { Value } } = Task;
      return {
        type: 'WaitCustomString',
        value: Value,
      };
    }
    case 'RPG.GameCore.TriggerSound': {
      // 사운드
      break;
    }
    case 'RPG.GameCore.PlayTimeline': {
      const { Type, TimelineName }= Task;
      switch (Type) {
        case 'Cutscene': {
          const { CaptionPath, CutSceneName } = CutSceneConfig[TimelineName];
          const Caption = readJsonFile(rp(CaptionPath));
          const { CaptionList } = Caption;
          const captions = CaptionList.map(({ CaptionTextID }) => t(CaptionTextID));
          return {
            type: 'Cutscene',
            captions,
            name: CutSceneName,
          };
        }
        default: {
          // console.log(Task);
          // console.log('Unabled to parse timeline', TimelineName);
          return {
            type: 'ComplexTalk',
            name: TimelineName,
          };
        }
      }
      break;
    }
    case 'RPG.GameCore.PlaySimpleTalk': {
      const { SimpleTalkList } = Task;
      const speakings = SimpleTalkList.map(({ TalkSentenceID }) => tt(TalkSentenceID));
      return {
        type: 'PlaySimpleTalk',
        speakings,
      };
    }
    case 'RPG.GameCore.PlayOptionTalk': {
      const { OptionList } = Task;
      return {
        type: 'PlayOptionTalk',
        list: OptionList.map(({ TalkSentenceID, OptionIconType }) => ({
          TalkSentenceID,
          isContinue: 'ChatContinueIcon' === OptionIconType,
          text: tt(TalkSentenceID),
        })),
      };
    }
    case 'RPG.GameCore.PlayAndWaitSimpleTalk': {
      const { SimpleTalkList } = Task;
      const speakings = SimpleTalkList.map(({ TalkSentenceID }) => tt(TalkSentenceID));
      return {
        type: 'PlayAndWaitSimpleTalk',
        speakings,
      };
    }
    case 'RPG.GameCore.ShowTalkUI': {
      // ?
      break;
    }
    case 'RPG.GameCore.PlayMessage': {
      const { MessageSectionID } = Task;
      // ExcelOutput/MessageSectionConfig.json
      // ExcelOutput/MessageItemConfig.json
      break;
    }
    case 'RPG.GameCore.PredicateTaskList': {
      const { SuccessTaskList, FailedTaskList, Predicate } = Task;
      return {
        type: 'PredicateTaskList',
        Predicate,
        success: parseTaskList(SuccessTaskList),
        failed: parseTaskList(FailedTaskList),
      };
    }
    default: {
      console.log('Unknown Task', JSON.stringify(Task, undefined, 2));
      restTaskType.add(type);
      break;
    }
    case 'RPG.GameCore.SwitchCharacterAnchor':
    case 'RPG.GameCore.LevelPerformanceInitialize':
    case 'RPG.GameCore.EndPerformance':
    case 'RPG.GameCore.WaitPerformanceEnd':
    case 'RPG.GameCore.FinishLevelGraph':
    case 'RPG.GameCore.LockPlayerControl':
    case 'RPG.GameCore.DestroyProp':
    case 'RPG.GameCore.PropTriggerAnimState':
    case 'RPG.GameCore.PerformanceTransition':
    case 'RPG.GameCore.WaitSecond':
    case 'RPG.GameCore.AnimSetParameter':
    case 'RPG.GameCore.CreateNPCMonster':
    case 'RPG.GameCore.PropSetupTrigger':
    case 'RPG.GameCore.SetAudioEmotionState':
    case 'RPG.GameCore.PlayScreenTransfer':
    case 'RPG.GameCore.UnLockPlayerControl':
    case 'RPG.GameCore.CreateProp':
    case 'RPG.GameCore.AdvEnablePropDialogMode':
    case 'RPG.GameCore.CreateNPC':
    case 'RPG.GameCore.CaptureLocalPlayer':
    case 'RPG.GameCore.CharacterTriggerAnimState':
    case 'RPG.GameCore.EnterMap':
    case 'RPG.GameCore.PropReqInteract':
    case 'RPG.GameCore.EnableNPCMonsterAI':
    case 'RPG.GameCore.EnablePerformanceMode':
    case 'RPG.GameCore.BlockInputController':
    case 'RPG.GameCore.DestroyNPC':
    case 'RPG.GameCore.ActiveVirtualCamera':
    case 'RPG.GameCore.AdventureCameraLookAt':
    case 'RPG.GameCore.CaptureNPCToCharacter':
    case 'RPG.GameCore.CharacterTriggerFreeStyle':
    case 'RPG.GameCore.SetHLODSwitchDelay':
    case 'RPG.GameCore.AddStreamingSource':
    case 'RPG.GameCore.TriggerEffect':
    case 'RPG.GameCore.RemoveEffect':
    case 'RPG.GameCore.RemoveStreamingSource':
    case 'RPG.GameCore.CacheUI':
    case 'RPG.GameCore.ReleaseCacheUI':
    case 'RPG.GameCore.WaitSimpleTalkFinish':
    case 'RPG.GameCore.PropStateExecute':
    case 'RPG.GameCore.AdvEntityFaceTo':
    case 'RPG.GameCore.PropMoveTo': {
      // ignored
    }
  }
}

console.log('-------------');
console.log('resetTaskType');
console.log([...restTaskType]);
console.log('-------------');
