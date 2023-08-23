// file utils
const fs = require('fs');
const fsPromises = fs.promises;
const sep = require('path').sep;
const readJsonFile = path => JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' }));

// path utils
const currentPath = `.${sep}StarRailData`;
const normalizePath = path => `${currentPath}${sep}${path}`;
const getMissionInfoPath = missionId => `Config/Level/Mission${sep}${missionId}${sep}MissionInfo_${missionId}.json`;
const getDropsDirPath = missionId => `Config/Level/Mission${sep}${missionId}${sep}Drop`;
const getTalksDirPath = missionId => `Config/Level/Mission${sep}${missionId}${sep}Talk`;
const getActsDirPath = missionId => `Config/Level/Mission${sep}${missionId}${sep}Act`;
const getBattlesDirPath = missionId => `Config/Level/Mission${sep}${missionId}${sep}Battle`;
const NPCDialogueDirPath = 'Config/Level/NPCDialogue';
const PropDialogueDirPath = 'Config/Level/PropDialogue';

// Static Data
const MainMission = readJsonFile(normalizePath('ExcelOutput/MainMission.json'));
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

// talk sentence config utils
const talkUsedMap = {};
const TalkSentenceConfigKeys = Object.keys(TalkSentenceConfig);
const t = hash => TextMap[hash?.Hash ?? hash]; // hash
const tt = (tk, checked = 1) => {
  if (+tk === 100040120) {
    // console.log(Error('있는데?').stack);
  }
  if (checked) {
    talkUsedMap[tk] = 1; // check as used
  }
  if (!TalkSentenceConfig[tk]) {
    return { TalkSentenceID: tk };
  }
  const { TextmapTalkSentenceName: name, TalkSentenceText: text } = TalkSentenceConfig[tk];
  return { TalkSentenceID: tk, name: t(name), text: t(text) };
}
const getGroupTalkKeys = groupId => TalkSentenceConfigKeys.filter(key => key.startsWith(groupId) && key.length === 9);

// utils
const toJsonString = obj => JSON.stringify(obj, undefined, 2);
const removeDup = iter => [...new Set(iter)];
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

// NPC Dialogue
// Prop Dialogue
const parseDialogue = (path, dialogArr, context, label = 'path') => {
  const stat = fs.statSync(normalizePath(path));
  if (stat.isDirectory()) {
    const filenames = fs.readdirSync(normalizePath(path));
    for (const filename of filenames) {
      parseDialogue(`${path}${sep}${filename}`, dialogArr, context, label);
    }
  } else {
    const json = readJsonFile(normalizePath(path));
    const dialog = parseSequenceObject(json, context);
    dialogArr.push({ [label]: path, dialog });
  }
}

const npcDialog = [];
parseDialogue(NPCDialogueDirPath, npcDialog, context, 'npcPath');
console.log('============================');
console.log('--------- npc dialog -------');
console.log(toJsonString(npcDialog));
console.log('----------------------------');

const propDialog = [];
parseDialogue(PropDialogueDirPath, propDialog, context, 'propPath');
console.log('============================');
console.log('-------- prop dialog -------');
console.log(toJsonString(propDialog));
console.log('----------------------------');

// TODO: 조절 혹은 arguments
// const givenKeys = [1000101];
const givenKeys = [];

// MainMission ID 에 대해서
// 7자리
// TRRGGMM
// * 임무 타입 T
// 1 - 개척 임무
// 2 - 월드 임무, 동행 임무, 열계의 징조 등
// 3 - 일일 임무
// 4 - 균형의 시련, 오염 청소, 눈에는 눈, 시뮬레이션 우주, 꽃받침, 폼폼 임무 등
// 6 - 동행 임무 (최신)
// 8 - 이벤트 임무
// * 지역 코드 RR
// 00 - 우주정거장 헤르타
// 01 - 야릴로 VI
// 02 - 선주 나부
// * 그룹 번호 GG
// 개척 임무 10002 의 경우 1000201~1000204 의 메인 미션으로 이루어져있다
// 이름이 같을 수 있다
// 월드 임무의 경우 전혀 엉뚱한 것들이 그룹으로 묶일 수 있다
// * 임무 번호 MM
// 임무 순서를 나타낸다
// 임무 순서가 연속되지 않으면 별개의 그룹으로 취급한다
const keys = Object.keys(MainMission);
keys.sort();

/**
 * ```
 * {
 *   [type: string]: {
 *     [regionCode: string]: {
 *       groupId: string, // 겹칠 수 있음
 *       missions: string[], // 연속된 숫자
 *     }[]
 *   }
 * }
 * ```
 */
const groupedIdByTypeRegion = (givenKeys.length ? givenKeys : keys).reduce((result, mainMissionId) => {
  if (mainMissionId.length !== 7) {
    console.error('Invalid MainMission Id', mainMissionId);
    return result;
  }
  const type = mainMissionId[0];
  const regionCode = mainMissionId.slice(1, 3);
  const groupId = mainMissionId.slice(3, 5);
  const missionId = mainMissionId.slice(5, 7);

  const groups = result?.[type]?.[regionCode] ?? [];
  const lastSameGroup = [...groups].reverse().find(group => group.groupId === groupId);
  if (lastSameGroup === undefined) {
    return Object.assign(result, {
      [type]: Object.assign(result[type] ?? {}, {
        [regionCode]: [...groups, { groupId, missions: [missionId] }],
      }),
    });
  }

  if (+lastSameGroup.missions.at(-1) + 1 !== +missionId) {
    return Object.assign(result, {
      [type]: Object.assign(result[type] ?? {}, {
        [regionCode]: [...groups, { groupId, missions: [missionId] }],
      }),
    });
  }

  lastSameGroup.missions.push(missionId);
  return Object.assign(result, {
    [type]: Object.assign(result[type] ?? {}, {
      [regionCode]: groups,
    }),
  });
}, {});

Object.entries(groupedIdByTypeRegion).forEach(
  ([type, groupedIdByRegion]) => Object.entries(groupedIdByRegion).forEach(
    ([regionCode, groups]) => groups.forEach(
      ({ groupId, missions }) => {
        const groupedMainMissionIds = missions.map(missionId => `${type}${regionCode}${groupId}${missionId}`);
        handleGroupedMissions(`${type}${regionCode}${groupId}`, groupedMainMissionIds);
      }
    )
  )
);

function handleGroupedMissions(missionGroupId, missionIds) {
  console.log('========================================================================');
  console.log('MainMisson Group:', missionGroupId);
  console.log('List::');
  missionIds.forEach(missionId => {
  console.log('-', t(MainMission[missionId].Name));
  });
  console.log('------------------------------------------------------------------------');

  const missionInfos = missionIds.flatMap(missionId => {
    const MissionInfoPath = getMissionInfoPath(missionId);
    try {
      const MissionInfo = readJsonFile(normalizePath(MissionInfoPath));
      return [MissionInfo]
    } catch (err) {
      // console.warn(err);
      return [];
    }
  });
  const SubMissionListInGroupedMission = missionInfos.flatMap(({ SubMissionList }) => SubMissionList); // merged

  const list = [...SubMissionListInGroupedMission];
  const map = {};
  const sortedSubMissionList = [];
  let count = 0;
  // FIXME: 이상한 소팅임
  // A -> B 가 있으니 트리를 만든다음 거꾸로 나가면 됨
  // 고리가 있는 경우 먼저 나온 애 순서로
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

    if (count > SubMissionListInGroupedMission.length * (SubMissionListInGroupedMission.length + 1) / 2) { // 망함
      SubMissionListInGroupedMission.forEach(SubMission => {
        // console.debug(SubMission.ID, ' ---> ', SubMission.TakeParamIntList);
      });
      console.log('------------');
      console.log('Sorting SubMissionList Failed:', missionIds);
      console.log('------------');
      successSorting = false;
      break;
    }
  }

  const totalDialogs = [];

  const dialogs = [];
  (successSorting ? sortedSubMissionList : SubMissionListInGroupedMission).forEach(SubMission => {
    const { ID, MissionJsonPath } = SubMission;
    if (!MissionJsonPath) {
      return;
    }
    try {
      const MissionJson = readJsonFile(normalizePath(MissionJsonPath));

      const dialog = parseSequenceObject(MissionJson, context);
      dialogs.push({ SubMissionID: ID, dialog });
    } catch (err) {
      console.error(err);
    }
  });
  console.log('--------------- MainMission Dialog ---------');
  console.log(toJsonString(dialogs));
  totalDialogs.push(dialogs);

  const others = [
    { name: 'drop', getPath: getDropsDirPath },
    { name: 'talk', getPath: getTalksDirPath },
    { name: 'act', getPath: getActsDirPath },
    { name: 'battle', getPath: getBattlesDirPath },
  ];

  others.forEach(({ name, getPath }) => {
    const dialogs = [];
    const dirPaths = missionIds.map(missionId => getPath(missionId))
      .filter(path => fs.existsSync(normalizePath(path)));
    dirPaths.forEach(dirPath => {
      const filenames = fs.readdirSync(normalizePath(dirPath));
      filenames.map(filename => `${dirPath}${sep}${filename}`)
        .filter(filename => !checkPerformanceRead[filename]) // 위에서 읽은 것 제외하기
        .forEach(filePath => {
        try {
          const jsonObject = readJsonFile(normalizePath(filePath));

          const dialog = parseSequenceObject(jsonObject, context);
          if (dialog.length) {
            dialogs.push({ [name + 'Path']: filePath, dialog });
          }
        } catch (err) {
          console.error(err);
        }
      });
    });
    console.log(`--------------- ${name[0].toUpperCase()}${name.slice(1)} Dialog ---------`);
    console.log(toJsonString(dialogs));
    totalDialogs.push(dialogs);
  });

  // 남은 것 중 그룹이 같은 걸 찾아보기
  Promise.resolve().then(() => {
    console.log('========================================================================');
    console.log('MainMisson Related Missing Dialog:', missionGroupId);
    console.log('MainMisson Group:', missionGroupId);
    console.log('List::');
    missionIds.forEach(missionId => {
    console.log('-', t(MainMission[missionId].Name));
    });
    console.log('------------------------------------------------------------------------');
    const ids = removeDup(totalDialogs.flatMap(_ => _).flatMap(({ dialog }) => {
      return [...JSON.stringify(dialog, undefined, 2).matchAll(/"TalkSentenceID": (\d+),/g)]
        .map(matched => matched[1]);
    }));
    const groupIds = removeDup(ids.map(id => Math.floor(id / Math.pow(10, 2)).toString()));
    const groupedMissingKeys = groupIds.flatMap(groupId => {
      const TalkSentenceIDs = getGroupTalkKeys(groupId).filter(key => !talkUsedMap?.[key]);
      if (!TalkSentenceIDs.length) return [];
      return [{
        groupId,
        TalkSentenceIDs
      }];
    });

    // TODO: Config/Level/NPCDialogue Config/Level/PropDialogue 를 추가로 봐야함
    // 여기에 물건을 누르든지 NPC 에게 말을 거는 거든지 하는 게 있음
    console.log(`--------------- Related Missing Dialog ---------`);
    groupedMissingKeys.forEach(({ groupId, TalkSentenceIDs }) => {
      console.log('groupId', groupId);
      TalkSentenceIDs.forEach(TalkSentenceID => {
      console.log('- Talk', TalkSentenceID, tt(TalkSentenceID));
      });
    });
  });
}


Promise.resolve().then(() => {
  console.log('====== summary =======');
  console.log('-------------');
  console.log('resetTaskType');
  console.log(JSON.stringify([...restTaskType], undefined, 2));
  console.log('-------------');


  const notUsedTalkKeys = TalkSentenceConfigKeys.filter(tk => !talkUsedMap[tk]);
  console.log('-------------');
  console.log('missing talk ids num:', notUsedTalkKeys.length, '/', TalkSentenceConfigKeys.length);
  console.log(JSON.stringify(notUsedTalkKeys.map(key => tt(key)).filter(({ text }) => text), undefined, 2));
  console.log('-------------');
});

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
 * // 더 많이 추가됐음
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
        if (checkPerformanceRead) {
          checkPerformanceRead[PerformancePath] = 1; // check as read
        }

        const Performance = readJsonFile(normalizePath(PerformancePath));

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
              missingRestTalks,
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
      const callback = parseTaskList(ButtonCallback, context);
      return {
        type: 'PropSetupUITrigger',
        callback,
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
    case 'RPG.GameCore.PerformanceTransition':
    case 'RPG.GameCore.PlayScreenTransfer': { // 검은 화면 텍스트
      const { TalkSentenceID } = Task;
      return {
        type: 'PlayScreenTransfer',
        speaking: tt(TalkSentenceID),
      };
    }
    case 'RPG.GameCore.PropSetupTrigger': { // 장소 이동 활성화
      const { OnTriggerEnter } = Task;
      const callback = parseTaskList(OnTriggerEnter, context);
      return {
        type: 'PropSetupTrigger',
        callback,
      };
    }
    case 'RPG.GameCore.RandomConfig': {
      const { TaskList } = Task;
      const callback = parseTaskList(TaskList, context);
      return {
        type: 'RandomConfig',
        callback,
      };
    }
    case 'RPG.GameCore.PropStateExecute': {
      const { Execute } = Task;
      const callback = parseTaskList(Execute, context);
      return {
        type: 'PropStateExecute',
        callback,
      };
    }
    case 'RPG.GameCore.NpcToPlayerDistanceTrigger': {
      const { FarTask } = Task;
      const callback = parseTaskList(FarTask, context);
      return {
        type: 'NpcToPlayerDistanceTrigger',
        callback,
      };
    }
    case 'RPG.GameCore.ConsumeMissionItemPerformance': {
      const { OnSubmitConfirm, OnSubmitCancel } = Task;
      const submit = parseTaskList(OnSubmitConfirm, context);
      const cancel = parseTaskList(OnSubmitCancel, context);
      return {
        type: 'ConsumeMissionItemPerformance',
        submit,
        cancel,
      };
    }
    case 'RPG.GameCore.SelectMissionItem': {
      const { SimpleTalk, ItemSelect, OnSubmitSucceed, OnSubmitFail, OnSubmitCancel } = Task;
      const success = parseTaskList(OnSubmitSucceed, context);
      const fail = parseTaskList(OnSubmitFail, context);
      const cancel = parseTaskList(OnSubmitCancel, context);
      return {
        type: 'SelectMissionItem',
        text: SimpleTalk ? tt(SimpleTalk.TalkSentenceID) : null,
        ItemSelect,
        success,
        fail,
        cancel,
      };
    }
    case 'RPG.GameCore.WaitPhotoGraphResult': {
      const { OnSuccess } = Task;
      const success = parseTaskList(OnSuccess, context);
      return {
        type: 'WaitPhotoGraphResult',
        success,
      };
    }
    case 'RPG.GameCore.SelectorConfig': {
      const { TaskList } = Task;
      const callback = parseTaskList(TaskList, context);
      return {
        type: 'RandomConfig',
        callback,
      };
    }
    case 'RPG.GameCore.ShowEnvBuffDialog': {
      const { OnCancel } = Task;
      const cancel = parseTaskList(OnCancel, context);
      return {
        type: 'ShowEnvBuffDialog',
        cancel,
      };
    }
    case 'RPG.GameCore.BattlePlayTalk': {
      const { TalkList } = Task;
      const speakings = TalkList.map(({ TalkSentenceID }) => tt(TalkSentenceID));
      return {
        type: 'BattlePlayTalk',
        speakings,
      };
    }
    case 'RPG.GameCore.PlayNPCBubbleTalk': {
      // ignore
      const { BubbleTalkInfoList } = Task;
      const speakings = BubbleTalkInfoList.map(({ TalkSentenceID }) => tt(TalkSentenceID));
      return;
    }
    default: {
      // console.warn('Unknown Task', JSON.stringify(Task, undefined, 2));
      restTaskType.add(type);
      if (/TalkSentenceID/.test(JSON.stringify(Task, undefined, 2))) {
        return { type: 'ImportantUnhandledTask', Task };
      }
      break;
    }
  }
}

/**
 * PlayTimeline-ComplexTalk 를 PlayTimeline-ComplexTalk-Recovered 로 복구하는 코드
 * @params sequenceObject DialogSequence
 * @returns DialogSequence
 */
function parsePerformanceWithOptions(sequenceObject, missingRestTalks) {
  return sequenceObject;
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

