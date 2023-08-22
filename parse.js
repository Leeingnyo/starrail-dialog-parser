// file utils
const fs = require('fs');
const fsPromises = fs.promises;
const sep = require('path').sep;
const readJsonFile = path => JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));

// path utils
const currentPath = `.${sep}StarRailData`;
const normalizePath = path => `${currentPath}${sep}${path}`;
const mainMissionMap = readJsonFile(normalizePath('ExcelOutput/MainMission.json'));
const ConfigLevelMissionPath = normalizePath('Config/Level/Mission');
const getMissionInfoPath = key => `${ConfigLevelMissionPath}${sep}${key}${sep}MissionInfo_${key}.json`;
const getTalksDirPath = key => `Config/Level/Mission${sep}${key}${sep}Talk`;
const getActsDirPath = key => `Config/Level/Mission${sep}${key}${sep}Act`;

// Static Data
const performanceMap = {
  A: readJsonFile(normalizePath('ExcelOutput/PerformanceA.json')), // Act
  C: readJsonFile(normalizePath('ExcelOutput/PerformanceC.json')), // Cutscene
  CG: readJsonFile(normalizePath('ExcelOutput/PerformanceCG.json')),
  D: readJsonFile(normalizePath('ExcelOutput/PerformanceD.json')), // ?
  DS: readJsonFile(normalizePath('ExcelOutput/PerformanceDS.json')),
  E: readJsonFile(normalizePath('ExcelOutput/PerformanceE.json')), // ?
  RecallData: readJsonFile(normalizePath('ExcelOutput/PerformanceRecallData.json')),
  PlayVideo: readJsonFile(normalizePath('ExcelOutput/PerformanceVideo.json')),
};
const VideoConfig = readJsonFile(normalizePath('ExcelOutput/VideoConfig.json'));
const CutSceneConfig = readJsonFile(normalizePath('ExcelOutput/CutSceneConfig.json'));
const TalkSentenceConfig = readJsonFile(normalizePath('ExcelOutput/TalkSentenceConfig.json'));
const TextMap = readJsonFile(normalizePath('TextMap/TextMapKR.json'));

const talkUsedMap = {};
const TalkSentenceConfigKeys = Object.keys(TalkSentenceConfig);
const t = hash => TextMap[hash?.Hash ?? hash]; // hash
const tt = tk => {
  if (!TalkSentenceConfig[tk]) {
    return;
  }
  const { TextmapTalkSentenceName: name, TalkSentenceText: text } = TalkSentenceConfig[tk];
  talkUsedMap[tk] = 1; // check as used
  return { TalkSentenceID: tk, name: t(name), text: t(text) };
}
const getGroupTalkKeys = groupId => TalkSentenceConfigKeys.filter(key => key.startsWith(groupId) && key.length === 9);

// utils
const getGroupId = ids => {
  const xor = Array.from(Array(9).keys())
    .find(i =>
      ids.map(id => Math.floor(id / Math.pow(10, i)))
        .every((id, _, [first]) => first === id)
    );
  return Math.floor(ids[0] / Math.pow(10, xor));
};
const getTalkSentenceId = d => d.replace('TalkSentence_', '')

// global variables
const restTaskType = new Set();
const checkPerformanceRead = {};

/**
 * application context
 */
const context = { checkPerformanceRead, talkUsedMap, restTaskType };

// ===================================================
// APPLICATION START
// ===================================================
{

const keys = Object.keys(mainMissionMap);
// TODO: 조절 혹은 arguments
// const givenKeys = ['1000101'];
const givenKeys = [];

(givenKeys.length ? givenKeys : keys).forEach(key => {
  console.log('========================================================================');
  console.log('MainMisson:', key, t(mainMissionMap[key].Name));
  console.log('------------------------------------------------------------------------');

  const mission = mainMissionMap[key];
  const MissionInfoPath = getMissionInfoPath(key);
  const MissionInfo = readJsonFile(MissionInfoPath);
  const { SubMissionList } = MissionInfo;

  const list = [...SubMissionList];
  const map = {};
  const sortedSubMissionList = [];
  let count = 0;
  let successSorting = true;
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
      SubMissionList.forEach(SubMission => {
        // console.debug(SubMission.ID, ' ---> ', SubMission.TakeParamIntList);
      });
      console.log('------------');
      console.log('Sorting SubMissionList Failed:', key);
      console.log('------------');
      successSorting = false;
      break;
    }
  }

  const dialogs = [];

  (successSorting ? sortedSubMissionList : SubMissionList).forEach(SubMission => {
    const { ID, MissionJsonPath } = SubMission;
    if (!MissionJsonPath) {
      return;
    }
    try {
      const MissionJson = readJsonFile(normalizePath(MissionJsonPath));

      const dialog = parseSequenceObject(MissionJson, context);
      if (dialog.length) {
        dialogs.push({ ID, dialog });
      }
    } catch (err) {
      console.error(err);
    }
  });

  console.log('--------------- MainMission Dialog ---------');
  console.log(
    JSON.stringify(dialogs, undefined, 2)
  );

  // Items
  const TalksDirPath = getTalksDirPath(key)
  if (fs.existsSync(normalizePath(TalksDirPath))) {
    const others = [];

    const filenames = fs.readdirSync(normalizePath(TalksDirPath));
    filenames.map(filename => `${TalksDirPath}${sep}${filename}`).forEach(talkPath => {
      try {
        const talkJson = readJsonFile(normalizePath(talkPath));

        const dialog = parseSequenceObject(talkJson, context);
        if (dialog.length) {
          others.push({ dialog });
        }
      } catch (err) {
        console.error(err);
      }
    });

    console.log('--------------- Talk Dialog ---------');
    console.log(
      JSON.stringify(others, undefined, 2)
    );
  }

  // Acts
  const ActsDirPath = getActsDirPath(key)
  if (fs.existsSync(normalizePath(ActsDirPath))) {
    const others = [];

    const filenames = fs.readdirSync(normalizePath(ActsDirPath));
    filenames.map(filename => `${ActsDirPath}${sep}${filename}`).filter(s => !checkPerformanceRead[s]).forEach(actPath => {
      try {
        const actJson = readJsonFile(normalizePath(actPath));

        const dialog = parseSequenceObject(actJson, context);
        if (dialog.length) {
          others.push({ dialog });
        }
      } catch (err) {
        console.error(err);
      }
    });

    console.log('--------------- Acts Dialog ---------');
    console.log(
      JSON.stringify(others, undefined, 2)
    );
  }
});

console.log('====== summary =======');
console.log('-------------');
console.log('resetTaskType');
console.log(JSON.stringify([...restTaskType], undefined, 2));
console.log('-------------');

const notUsedTalkKeys = TalkSentenceConfigKeys.filter(tk => !talkUsedMap[tk]);
console.log('-------------');
console.log('missing talk ids num:', notUsedTalkKeys.length, '/', TalkSentenceConfigKeys.length);
// console.log(JSON.stringify(notUsedTalkKeys, undefined, 2));
console.log('-------------');

}
// ===================================================
// APPLICATION END
// ===================================================

/**
 * SequenceObject::
 * MissionJson, Performance
 * @returns DialogSequence = { taskListIndex: number; taskList: ParsedTask[] }[]
 */
function parseSequenceObject({ OnInitSequece, OnStartSequece }, context) {
  const dialog = [];
  OnStartSequece.forEach((Sequence, index) => {
    const taskList = parseTaskList(Sequence.TaskList, context);
    if (taskList.length) {
      dialog.push({ taskListIndex: index, taskList });
    }
  });
  return dialog;
}

/**
 * @returns ParsedTask[]
 * undefined 등 불순물 없음
 */
function parseTaskList(TaskList = [], context) {
  return TaskList.map(Task => parseTask(Task, context)).filter(s => s);
}

/**
 * @types Talk { TalkSentenceID: string | number; name: string; text: string }
 * @types OptionTalk { TalkSentenceID: string; isContinue: boolean; text: Talk }
 */

/*
 * context
 * - checkPerformanceRead
 * - talkUsedMap
 * - restTaskType
 *
 * @returns ParsedTask = { type: string }
 * | { type: 'TriggerPerformance'; PerformanceType: 'PlayVideo' | 'A' | 'D' | 'C' 'E'; content: DialogSequence }
 * | { type: 'PlayVideo'; VideoID: string; captions: string[] }
 * | { type: 'PlayMissionTalk'; speakings: Talk[] }
 * | { type: 'PropSetupUITrigger'; returns: ParsedTask[] }
 * | { type: 'TriggerCustomString'; value: string }
 * | { type: 'WaitCustomString'; value: string }
 * | { type: 'PlayTimeline-Cutscene'; captions: string[], name: string }
 * | { type: 'PlayTimeline-ComplexTalk'; name: string }
 * | { type: 'PlayTimeline-ComplexTalk-Recovered'; name: string; speakings: Talk[] }
 * | { type: 'PlaySimpleTalk'; speakings: Talk[] }
 * | { type: 'PlayOptionTalk'; options: OptionTalk[] }
 * | { type: 'PlayAndWaitSimpleTalk'; speakings: Talk[] }
 * | { type: 'PlayMessage'; MessageSectionID: string }
 * | { type: 'PredicateTaskList'; Predicate: unknown; success: ParsedTask[]; failed: ParsedTask[] }
 * |
 */
function parseTask(Task, context = {}) {
  const { $type: type } = Task;
  const { checkPerformanceRead, talkUsedMap, restTaskType } = context;
  switch (type) {
    case 'RPG.GameCore.FinishPerformanceMission': {
      // console.log(`SubMission ${ID} 종료`);
      break;
    }
    case 'RPG.GameCore.TriggerPerformance': {
      const { PerformanceType, PerformanceID } = Task;
      if (!performanceMap[PerformanceType]?.[PerformanceID]) {
        return;
      }
      const { PerformancePath } = performanceMap[PerformanceType][PerformanceID];
      try {
        const Performance = readJsonFile(normalizePath(PerformancePath));

        if (checkPerformanceRead) {
          checkPerformanceRead[PerformancePath] = 1; // check as read
        }

        switch (PerformanceType) {
          case 'PlayVideo': {
            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parseSequenceObject(Performance, context),
            };
          }
          case 'A': { // 자막 붙는 컷씬
            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parseSequenceObject(Performance, context),
            };
          }
          case 'D': { // 심플 토크
            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parseSequenceObject(Performance, context),
            };
          }
          case 'C': { // 인게임 컷씬 (나쁜 것)
            // PerformanceC 의 경우 playable 이란 asset 으로
            // 카메라 시점, 캐릭터의 애니메이션 등과 함께 대사 등이 들어있어서
            // json 만으로 대사를 추출해내기 어렵다
            //
            // 그러나 어느 performance 안의 playable 사이에
            // 플레이어가 선택지를 고를 수 있는 옵션이 있는 경우가 있다
            // 옵션에는 옵션의 텍스트 ID가 있고, 텍스트 ID 는 연속된 경우가 많으니
            // 이를 이용하여 옵션 앞 뒤의 playable 의 텍스트를 고칠 수도 있지 않을까?
            const parsedSequenceObject/** DialogSequence */ = parseSequenceObject(Performance, context);
            const optionTasks/** ParsedTask[] */ =
              parsedSequenceObject.map(({ taskList }) => taskList).flatMap(_ => _).filter(obj => obj.type === 'PlayOptionTalk');

            // PlayOptionTalk Task 가 있는지 확인
            if (optionTasks.length === 0) {
              // 없으면 복구 불가 판정
              console.warn('복구 불가', JSON.stringify(parsedSequenceObject, undefined, 2));
              // 그러나
              // 복구된 playable 가 있고, 그 앞 뒤의 playable 인 경우엔 또 복구할 여지가 있음
              // TODO: 미구현
              return {
                type: 'TriggerPerformance',
                PerformanceType,
                content: parsedSequenceObject,
              };
            }

            const ids = optionTasks.flatMap(({ options }) => options.map(({ TalkSentenceID }) => TalkSentenceID)); // number[]
            const groupId = getGroupId(ids).toString();
            const missing = 9 - groupId.length;

            const missingRestTalkKeys = getGroupTalkKeys(groupId);
            const missingRestTalks = missingRestTalkKeys.filter(key => !talkUsedMap?.[key]).map(key => ({ key, text: tt(key) }));

            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parsePerformanceWithOptions(parsedSequenceObject, missingRestTalks),
            };
          }
          case 'E': { // 얘넨 뭐지
            return {
              type: 'TriggerPerformance',
              PerformanceType,
              content: parseSequenceObject(Performance, context),
            };
          }
          default: {
            // console.warn('Unknown PerformanceType', PerformanceType, Task);
            break;
          }
        }
      } catch (err) {
        console.error(err);
        return;
      }
      break;
    }
    case 'RPG.GameCore.PlayVideo': {
      const { VideoID } = Task;
      if (!VideoConfig[VideoID]) {
        return;
      }
      const { CaptionPath } = VideoConfig[VideoID];
      if (!CaptionPath) {
        return {
          type: 'PlayVideo',
          VideoID,
          captions: [],
        };
      }
      try {
        const Caption = readJsonFile(normalizePath(CaptionPath));
        const { CaptionList } = Caption;
        const captions = CaptionList.map(({ CaptionTextID }) => t(CaptionTextID));
        return {
          type: 'PlayVideo',
          VideoID,
          captions,
        };
      } catch (err) {
        console.error(err);
        return;
      }
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
      const returns = parseTaskList(ButtonCallback, context);
      return {
        type: 'PropSetupUITrigger',
        returns,
      };
    }
    case 'RPG.GameCore.TriggerCustomStringOnDialogEnd':
    case 'RPG.GameCore.TriggerCustomString': {
      const { CustomString: { Value } } = Task;
      return {
        type: 'TriggerCustomString',
        value: Value,
      };
    }
    case 'RPG.GameCore.WaitCustomString': {
      if (!Task.CustomString) {
        return;
      }
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
          if (!CaptionPath) {
            return {
              type: 'PlayTimeline-Cutscene',
              captions: [],
              name: CutSceneName,
            };
          }
          try {
            const Caption = readJsonFile(normalizePath(CaptionPath));
            const { CaptionList } = Caption;
            const captions = CaptionList.map(({ CaptionTextID }) => t(CaptionTextID));
            return {
              type: 'PlayTimeline-Cutscene',
              captions,
              name: CutSceneName,
            };
          } catch (err) {
            console.error(err);
            return;
          }
        }
        default: {
          // console.log(Task);
          // console.log('Unabled to parse timeline', TimelineName);
          return {
            type: 'PlayTimeline-ComplexTalk',
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
        options: OptionList.map(({ TalkSentenceID, OptionIconType }) => ({
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
    case 'RPG.GameCore.PlayMessage': {
      const { MessageSectionID } = Task;
      // ExcelOutput/MessageSectionConfig.json
      // ExcelOutput/MessageItemConfig.json
      return {
        type: 'PlayMessage',
        MessageSectionID,
      };
    }
    case 'RPG.GameCore.PredicateTaskList': {
      const { SuccessTaskList, FailedTaskList, Predicate } = Task;
      return {
        type: 'PredicateTaskList',
        Predicate,
        success: SuccessTaskList ? parseTaskList(SuccessTaskList, context) : [],
        failed: FailedTaskList ? parseTaskList(FailedTaskList, context) : [],
      };
    }
    default: {
      // console.warn('Unknown Task', JSON.stringify(Task, undefined, 2));
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
    case 'RPG.GameCore.ShowTalkUI':
    case 'RPG.GameCore.AdvNpcFaceToPlayer':
    case 'RPG.GameCore.CharacterHeadLookAt':
    case 'RPG.GameCore.ClearTalkUI':
    case 'RPG.GameCore.CollectDataConditions':
    case 'RPG.GameCore.RandomConfig':
    case 'RPG.GameCore.PropMoveTo': {
      // ignored
    }
  }
}

/**
 * PlayTimeline-ComplexTalk 를 PlayTimeline-ComplexTalk-Recovered 로 복구하는 코드
 * @params sequenceObject DialogSequence
 * @returns DialogSequence
 */
function parsePerformanceWithOptions(sequenceObject, missingRestTalks) {
  const getMissingsBetween = (min, max) =>
    missingRestTalks.filter(({ key }) => min <= key && (max === undefined || key < max));
  // context
  const results = [];
  const sor = missingRestTalks.map(({ key }) => key).sort();
  let from = sor[0];
  let to = null;
  let options = null;
  let sortedOptions = null;
  let maxOptions = null;
  let optionCounts = 0;

  // 'Initial', 'PlayTimeline-ComplexTalk', 'PlayOptionTalk', 'WaitCustomString', 'TriggerCustomString', 'End'
  let status = 'Initial';

  // console.log('시작');
  const flatten = sequenceObject.map(({ taskList }) => taskList).flatMap(_ => _);
  for (const element of flatten) {
    switch (element.type) {
      case 'PlayOptionTalk': {
        // console.log('옵션이다');
        sortedOptions = element.options.map(({ TalkSentenceID }) => TalkSentenceID).sort();
        to = sortedOptions[0];
        maxOptions = sortedOptions.at(-1);
        // console.log(from, '에서부터 ', to, '까지 넣는다');
        const mis = getMissingsBetween(from, to);
        if (mis.length) {
          results.push(mis);
        }
        // console.log('옵션 객체를 만든다');
        options = element.options.reduce((map, { TalkSentenceID, text, isContinue }) => ({
          ...map,
          [TalkSentenceID]: [{ key: TalkSentenceID, text, isContinue }],
        }), {});
        optionCounts = element.options.length;
        break;
      }
      case 'WaitCustomString': {
        from = getTalkSentenceId(element.value);
        // console.log(from, '부터');
        break;
      }
      case 'PlayTimeline-ComplexTalk': { break; }
      case 'TriggerCustomString': {
        if (optionCounts === 0) {
          // console.log('뭔가 이상함');
          return;
        }
        optionCounts -= 1;
        to = getTalkSentenceId(element.value);
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
            options[optionKeys[0]].push(...mis);
            // FIXME: 코드 망했음
            // 분기가 없는 경우같은 게 있는 것 같음
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
  if (status === 'PlayTimeline-ComplexTalk') {
    const myFrom = Math.max(maxOptions.toString(), to.toString())
    // to 를 당겨서 끝까지를 추가
    results.push(options);
    results.push(getMissingsBetween(myFrom));
  }

  return results;
}

