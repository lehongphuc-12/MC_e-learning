import React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  FileText,
  GitBranch,
  Headphones,
  Image,
  ListChecks,
  MapPin,
  Mic2,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AnnotationType,
  CreateChoiceRequest,
  CreateQuestionRequest,
  QuestionMediaType,
  QuestionType,
  ScenarioNodeType,
} from '../types/quizTypes';

interface QuizQuestionEditorProps {
  question: CreateQuestionRequest;
  questionNumber: number;
  onChange: (question: CreateQuestionRequest) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const QUESTION_TYPES: { value: QuestionType; label: string; group: string }[] = [
  { value: 'SINGLE_CHOICE', label: 'Knowledge Quiz - Một đáp án', group: 'Knowledge Quiz' },
  { value: 'MULTIPLE_CHOICE', label: 'Knowledge Quiz - Nhiều đáp án', group: 'Knowledge Quiz' },
  { value: 'TRUE_FALSE', label: 'Knowledge Quiz - Đúng / Sai', group: 'Knowledge Quiz' },
  { value: 'FILL_BLANK', label: 'Knowledge Quiz - Điền từ', group: 'Knowledge Quiz' },
  { value: 'LISTEN_IDENTIFY_ERROR', label: 'Listen & Identify Error', group: 'Listening' },
  { value: 'LISTEN_LOCATE_ERROR', label: 'Listen & Locate Error', group: 'Listening' },
  { value: 'AUDIO_COMPARISON', label: 'Audio Comparison', group: 'Listening' },
  { value: 'LISTEN_CLASSIFY', label: 'Listen & Classify', group: 'Listening' },
  { value: 'SCRIPT_ANNOTATION', label: 'Script Annotation / Fix', group: 'Script' },
  { value: 'SCRIPT_WRITING', label: 'Script Writing', group: 'Script' },
  { value: 'ARRANGE_SCRIPT', label: 'Arrange Script', group: 'Script' },
  { value: 'ERROR_CORRECTION_LAB', label: 'Error Correction Lab', group: 'Script' },
  { value: 'SCENARIO_DECISION_TREE', label: 'Scenario Decision Tree', group: 'Scenario' },
  { value: 'ESSAY', label: 'Tự luận (Legacy)', group: 'Legacy' },
];

const CHOICE_TYPES: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'LISTEN_IDENTIFY_ERROR',
  'AUDIO_COMPARISON',
  'LISTEN_CLASSIFY',
];

const AUDIO_TYPES: QuestionType[] = [
  'LISTEN_IDENTIFY_ERROR',
  'LISTEN_LOCATE_ERROR',
  'AUDIO_COMPARISON',
  'LISTEN_CLASSIFY',
  'ERROR_CORRECTION_LAB',
];

const ERROR_REGION_TYPES: QuestionType[] = [
  'LISTEN_LOCATE_ERROR',
  'ERROR_CORRECTION_LAB',
];

const WRITING_TYPES: QuestionType[] = ['SCRIPT_WRITING', 'ESSAY'];

const createChoice = (orderIndex: number): CreateChoiceRequest => ({
  choiceText: '',
  optionValue: null,
  isCorrect: false,
  explanation: null,
  orderIndex,
});

const normalizeQuestionForType = (
  question: CreateQuestionRequest,
  type: QuestionType
): CreateQuestionRequest => {
  const base: CreateQuestionRequest = {
    ...question,
    questionType: type,
    choices: [],
    media: [],
    errorRegions: [],
    annotations: [],
    arrangeItems: [],
    writingConfig: null,
    scenarioNodes: [],
  };

  if (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LISTEN_IDENTIFY_ERROR', 'LISTEN_CLASSIFY'].includes(type)) {
    base.choices = [createChoice(1), createChoice(2)];
  }

  if (type === 'TRUE_FALSE') {
    base.choices = [
      { ...createChoice(1), choiceText: 'Đúng', optionValue: 'TRUE' },
      { ...createChoice(2), choiceText: 'Sai', optionValue: 'FALSE' },
    ];
  }

  if (type === 'FILL_BLANK') {
    base.choices = [
      {
        ...createChoice(1),
        choiceText: '',
        optionValue: '',
        isCorrect: true,
      },
    ];
  }

  if (type === 'LISTEN_IDENTIFY_ERROR') {
    base.media = [
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio câu hỏi',
        durationSeconds: null,
        orderIndex: 1,
      },
    ];
  }

  if (type === 'LISTEN_LOCATE_ERROR') {
    base.media = [
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio câu hỏi',
        durationSeconds: null,
        orderIndex: 1,
      },
    ];
    base.errorRegions = [
      {
        startTimeMs: 0,
        endTimeMs: 1000,
        errorCategory: '',
        errorCode: '',
        description: null,
        correctionText: null,
        points: question.points ?? 1,
      },
    ];
  }

  if (type === 'AUDIO_COMPARISON') {
    base.media = [
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio A',
        durationSeconds: null,
        orderIndex: 1,
      },
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio B',
        durationSeconds: null,
        orderIndex: 2,
      },
    ];
    base.choices = [createChoice(1), createChoice(2)];
  }

  if (type === 'LISTEN_CLASSIFY') {
    base.media = [
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio câu hỏi',
        durationSeconds: null,
        orderIndex: 1,
      },
    ];
  }

  if (type === 'SCRIPT_ANNOTATION') {
    base.annotations = [
      {
        annotationType: 'PAUSE',
        startIndex: 0,
        endIndex: 1,
        annotationValue: null,
        explanation: null,
        points: question.points ?? 1,
      },
    ];
  }

  if (type === 'SCRIPT_WRITING') {
    base.writingConfig = {
      eventType: '',
      audience: '',
      style: '',
      minWords: null,
      maxWords: null,
      requiredElementsJson: null,
      gradingRubricJson: null,
    };
  }

  if (type === 'ARRANGE_SCRIPT') {
    base.arrangeItems = [
      { content: '', correctOrder: 1, isDistractor: false },
      { content: '', correctOrder: 2, isDistractor: false },
    ];
  }

  if (type === 'ERROR_CORRECTION_LAB') {
    base.media = [
      {
        mediaType: 'AUDIO',
        mediaUrl: '',
        label: 'Audio cần phân tích',
        durationSeconds: null,
        orderIndex: 1,
      },
    ];
    base.errorRegions = [
      {
        startTimeMs: 0,
        endTimeMs: 1000,
        errorCategory: '',
        errorCode: '',
        description: '',
        correctionText: '',
        points: question.points ?? 1,
      },
    ];
  }

  if (type === 'SCENARIO_DECISION_TREE') {
    base.scenarioNodes = [
      {
        clientKey: 'node-1',
        nodeType: 'SITUATION',
        title: 'Tình huống bắt đầu',
        content: '',
        mediaUrl: null,
        isStartNode: true,
        isEndNode: false,
        points: null,
        choices: [
          {
            choiceText: '',
            nextNodeClientKey: 'node-2',
            score: 0,
            feedback: null,
            orderIndex: 1,
          },
        ],
      },
      {
        clientKey: 'node-2',
        nodeType: 'RESULT',
        title: 'Kết quả',
        content: '',
        mediaUrl: null,
        isStartNode: false,
        isEndNode: true,
        points: question.points ?? 1,
        choices: [],
      },
    ];
  }

  return base;
};

export const QuizQuestionEditor: React.FC<QuizQuestionEditorProps> = ({
  question,
  questionNumber,
  onChange,
  onRemove,
  canRemove,
}) => {
  const update = <K extends keyof CreateQuestionRequest>(
    key: K,
    value: CreateQuestionRequest[K]
  ) => onChange({ ...question, [key]: value });

  const handleTypeChange = (type: QuestionType) => {
    onChange(normalizeQuestionForType(question, type));
  };

  const updateChoice = (
    index: number,
    patch: Partial<CreateChoiceRequest>
  ) => {
    const choices = question.choices.map((choice, i) =>
      i === index ? { ...choice, ...patch } : choice
    );
    update('choices', choices);
  };

  const addChoice = () => {
    update('choices', [
      ...question.choices,
      createChoice(question.choices.length + 1),
    ]);
  };

  const removeChoice = (index: number) => {
    update(
      'choices',
      question.choices
        .filter((_, i) => i !== index)
        .map((choice, i) => ({ ...choice, orderIndex: i + 1 }))
    );
  };

  const setCorrectChoice = (index: number, checked: boolean) => {
    if (question.questionType === 'MULTIPLE_CHOICE') {
      updateChoice(index, { isCorrect: checked });
      return;
    }

    update(
      'choices',
      question.choices.map((choice, i) => ({
        ...choice,
        isCorrect: i === index ? checked : false,
      }))
    );
  };

  const addMedia = (mediaType: QuestionMediaType = 'AUDIO') => {
    const media = question.media ?? [];
    update('media', [
      ...media,
      {
        mediaType,
        mediaUrl: '',
        label: '',
        durationSeconds: null,
        orderIndex: media.length + 1,
      },
    ]);
  };

  const updateMedia = (index: number, patch: Record<string, unknown>) => {
    update(
      'media',
      (question.media ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeMedia = (index: number) => {
    update(
      'media',
      (question.media ?? [])
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, orderIndex: i + 1 }))
    );
  };

  const addErrorRegion = () => {
    const regions = question.errorRegions ?? [];
    update('errorRegions', [
      ...regions,
      {
        startTimeMs: 0,
        endTimeMs: 1000,
        errorCategory: '',
        errorCode: '',
        description: '',
        correctionText: '',
        points: 1,
      },
    ]);
  };

  const updateErrorRegion = (
    index: number,
    patch: Record<string, unknown>
  ) => {
    update(
      'errorRegions',
      (question.errorRegions ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeErrorRegion = (index: number) => {
    update(
      'errorRegions',
      (question.errorRegions ?? []).filter((_, i) => i !== index)
    );
  };

  const addAnnotation = () => {
    update('annotations', [
      ...(question.annotations ?? []),
      {
        annotationType: 'PAUSE' as AnnotationType,
        startIndex: 0,
        endIndex: 1,
        annotationValue: '',
        explanation: '',
        points: 1,
      },
    ]);
  };

  const updateAnnotation = (
    index: number,
    patch: Record<string, unknown>
  ) => {
    update(
      'annotations',
      (question.annotations ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeAnnotation = (index: number) => {
    update(
      'annotations',
      (question.annotations ?? []).filter((_, i) => i !== index)
    );
  };

  const addArrangeItem = () => {
    const items = question.arrangeItems ?? [];
    update('arrangeItems', [
      ...items,
      {
        content: '',
        correctOrder: items.filter((x: any) => !x.isDistractor).length + 1,
        isDistractor: false,
      },
    ]);
  };

  const updateArrangeItem = (
    index: number,
    patch: Record<string, unknown>
  ) => {
    update(
      'arrangeItems',
      (question.arrangeItems ?? []).map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeArrangeItem = (index: number) => {
    update(
      'arrangeItems',
      (question.arrangeItems ?? []).filter((_, i) => i !== index)
    );
  };

  const moveArrangeItem = (index: number, direction: -1 | 1) => {
    const items = [...(question.arrangeItems ?? [])];
    const target = index + direction;

    if (target < 0 || target >= items.length) return;

    [items[index], items[target]] = [items[target], items[index]];

    const normalized = items.map((item: any, i) => ({
      ...item,
      correctOrder: item.isDistractor ? null : i + 1,
    }));

    update('arrangeItems', normalized);
  };

  const updateWritingConfig = (patch: Record<string, unknown>) => {
    update('writingConfig', {
      ...(question.writingConfig ?? {}),
      ...patch,
    });
  };

  const addScenarioNode = () => {
    const nodes = question.scenarioNodes ?? [];
    const clientKey = `node-${nodes.length + 1}`;

    update('scenarioNodes', [
      ...nodes,
      {
        clientKey,
        nodeType: 'INFORMATION' as ScenarioNodeType,
        title: '',
        content: '',
        mediaUrl: null,
        isStartNode: false,
        isEndNode: false,
        points: null,
        choices: [],
      },
    ]);
  };

  const updateScenarioNode = (
    index: number,
    patch: Record<string, unknown>
  ) => {
    update(
      'scenarioNodes',
      (question.scenarioNodes ?? []).map((node, i) =>
        i === index ? { ...node, ...patch } : node
      )
    );
  };

  const removeScenarioNode = (index: number) => {
    const nodes = question.scenarioNodes ?? [];
    if (nodes.length <= 2) return;

    update(
      'scenarioNodes',
      nodes.filter((_, i) => i !== index)
    );
  };

  const addScenarioChoice = (nodeIndex: number) => {
    const nodes = question.scenarioNodes ?? [];
    const node = nodes[nodeIndex];
    if (!node) return;

    const choices = node.choices ?? [];

    updateScenarioNode(nodeIndex, {
      choices: [
        ...choices,
        {
          choiceText: '',
          nextNodeClientKey: null,
          score: 0,
          feedback: '',
          orderIndex: choices.length + 1,
        },
      ],
    });
  };

  const updateScenarioChoice = (
    nodeIndex: number,
    choiceIndex: number,
    patch: Record<string, unknown>
  ) => {
    const nodes = question.scenarioNodes ?? [];
    const node = nodes[nodeIndex];
    if (!node) return;

    updateScenarioNode(nodeIndex, {
      choices: (node.choices ?? []).map((choice: any, i: number) =>
        i === choiceIndex ? { ...choice, ...patch } : choice
      ),
    });
  };

  const removeScenarioChoice = (
    nodeIndex: number,
    choiceIndex: number
  ) => {
    const nodes = question.scenarioNodes ?? [];
    const node = nodes[nodeIndex];
    if (!node) return;

    updateScenarioNode(nodeIndex, {
      choices: (node.choices ?? [])
        .filter((_: any, i: number) => i !== choiceIndex)
        .map((choice: any, i: number) => ({
          ...choice,
          orderIndex: i + 1,
        })),
    });
  };

  const renderChoices = () => {
    if (!CHOICE_TYPES.includes(question.questionType)) return null;

    return (
      <Section
        title="Đáp án"
        description={
          question.questionType === 'MULTIPLE_CHOICE'
            ? 'Có thể chọn nhiều đáp án đúng.'
            : 'Chọn một đáp án đúng.'
        }
        icon={<ListChecks className="h-5 w-5" />}
      >
        <div className="space-y-3">
          {question.choices.map((choice, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,180px)_auto]"
            >
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type={
                    question.questionType === 'MULTIPLE_CHOICE'
                      ? 'checkbox'
                      : 'radio'
                  }
                  name={`correct-${questionNumber}`}
                  checked={choice.isCorrect}
                  onChange={(e) =>
                    setCorrectChoice(index, e.target.checked)
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                Đúng
              </label>

              <input
                value={choice.choiceText}
                onChange={(e) =>
                  updateChoice(index, {
                    choiceText: e.target.value,
                  })
                }
                placeholder={`Đáp án ${index + 1}`}
                disabled={question.questionType === 'TRUE_FALSE'}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />

              <input
                value={choice.optionValue ?? ''}
                onChange={(e) =>
                  updateChoice(index, {
                    optionValue: e.target.value || null,
                  })
                }
                placeholder="Giá trị (tuỳ chọn)"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                disabled={
                  question.questionType === 'TRUE_FALSE' ||
                  question.choices.length <= 2
                }
                onClick={() => removeChoice(index)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <input
                value={choice.explanation ?? ''}
                onChange={(e) =>
                  updateChoice(index, {
                    explanation: e.target.value || null,
                  })
                }
                placeholder="Giải thích đáp án (không bắt buộc)"
                className="md:col-start-2 md:col-span-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {question.questionType !== 'TRUE_FALSE' && (
          <AddButton onClick={addChoice}>Thêm đáp án</AddButton>
        )}
      </Section>
    );
  };

  const renderFillBlank = () => {
    if (question.questionType !== 'FILL_BLANK') return null;

    const answer =
      question.choices[0] ??
      ({
        ...createChoice(1),
        isCorrect: true,
      } as CreateChoiceRequest);

    return (
      <Section
        title="Đáp án điền từ"
        description="Nhập đáp án đúng dùng để chấm tự động."
        icon={<FileText className="h-5 w-5" />}
      >
        <input
          value={answer.optionValue ?? answer.choiceText ?? ''}
          onChange={(e) => {
            const value = e.target.value;
            update('choices', [
              {
                ...answer,
                choiceText: value,
                optionValue: value,
                isCorrect: true,
                orderIndex: 1,
              },
            ]);
          }}
          placeholder="Ví dụ: phát âm"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />
      </Section>
    );
  };

  const renderMedia = () => {
    if (
      !AUDIO_TYPES.includes(question.questionType) &&
      !(question.media?.length)
    ) {
      return null;
    }

    return (
      <Section
        title="Media"
        description="Nhập URL audio, video hoặc hình ảnh của câu hỏi."
        icon={<Headphones className="h-5 w-5" />}
      >
        <div className="space-y-3">
          {(question.media ?? []).map((media: any, index: number) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[150px_minmax(0,1fr)_180px_auto]">
                <select
                  value={media.mediaType}
                  onChange={(e) =>
                    updateMedia(index, {
                      mediaType: e.target.value as QuestionMediaType,
                    })
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="AUDIO">Audio</option>
                  <option value="VIDEO">Video</option>
                  <option value="IMAGE">Hình ảnh</option>
                </select>

                <input
                  value={media.mediaUrl ?? ''}
                  onChange={(e) =>
                    updateMedia(index, {
                      mediaUrl: e.target.value,
                    })
                  }
                  placeholder="URL media..."
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

                <input
                  value={media.label ?? ''}
                  onChange={(e) =>
                    updateMedia(index, {
                      label: e.target.value || null,
                    })
                  }
                  placeholder="Nhãn"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-500">
                  Thời lượng (giây)
                </label>
                <input
                  type="number"
                  min={0}
                  value={media.durationSeconds ?? ''}
                  onChange={(e) =>
                    updateMedia(index, {
                      durationSeconds: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                  className="mt-1 block w-40 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <AddButton onClick={() => addMedia('AUDIO')}>
            Thêm audio
          </AddButton>
          <AddButton onClick={() => addMedia('VIDEO')}>
            Thêm video
          </AddButton>
          <AddButton onClick={() => addMedia('IMAGE')}>
            Thêm hình
          </AddButton>
        </div>
      </Section>
    );
  };

  const renderErrorRegions = () => {
    if (!ERROR_REGION_TYPES.includes(question.questionType)) return null;

    return (
      <Section
        title={
          question.questionType === 'ERROR_CORRECTION_LAB'
            ? 'Các lỗi cần phân tích và sửa'
            : 'Vùng lỗi trên timeline'
        }
        description="Thiết lập vị trí lỗi và thông tin dùng để chấm bài."
        icon={<MapPin className="h-5 w-5" />}
      >
        <div className="space-y-4">
          {(question.errorRegions ?? []).map(
            (region: any, index: number) => (
              <div
                key={index}
                className="rounded-xl border border-red-100 bg-red-50/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-red-700">
                    Lỗi {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeErrorRegion(index)}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Bắt đầu (ms)">
                    <input
                      type="number"
                      min={0}
                      value={region.startTimeMs}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          startTimeMs: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Kết thúc (ms)">
                    <input
                      type="number"
                      min={0}
                      value={region.endTimeMs}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          endTimeMs: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Nhóm lỗi">
                    <input
                      value={region.errorCategory ?? ''}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          errorCategory: e.target.value,
                        })
                      }
                      placeholder="Ví dụ: PRONUNCIATION"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Mã lỗi">
                    <input
                      value={region.errorCode ?? ''}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          errorCode: e.target.value,
                        })
                      }
                      placeholder="Ví dụ: PRON_TONE"
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Điểm">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={region.points ?? 1}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          points: Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Mô tả lỗi">
                    <input
                      value={region.description ?? ''}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          description: e.target.value || null,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                {question.questionType === 'ERROR_CORRECTION_LAB' && (
                  <Field label="Cách sửa">
                    <textarea
                      value={region.correctionText ?? ''}
                      onChange={(e) =>
                        updateErrorRegion(index, {
                          correctionText: e.target.value || null,
                        })
                      }
                      rows={3}
                      placeholder="Mô tả cách sửa lỗi..."
                      className={`${inputClass} resize-none`}
                    />
                  </Field>
                )}
              </div>
            )
          )}
        </div>

        <AddButton onClick={addErrorRegion}>Thêm vùng lỗi</AddButton>
      </Section>
    );
  };

  const renderAnnotations = () => {
    if (question.questionType !== 'SCRIPT_ANNOTATION') return null;

    return (
      <Section
        title="Annotation chuẩn"
        description="Đánh dấu vị trí pause, breath, emphasis hoặc biến đổi cao độ trong script."
        icon={<Mic2 className="h-5 w-5" />}
      >
        <div className="space-y-3">
          {(question.annotations ?? []).map(
            (annotation: any, index: number) => (
              <div
                key={index}
                className="rounded-xl border border-violet-100 bg-violet-50/40 p-4"
              >
                <div className="grid gap-3 md:grid-cols-4">
                  <select
                    value={annotation.annotationType}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        annotationType: e.target.value as AnnotationType,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="PAUSE">Pause</option>
                    <option value="BREATH">Breath</option>
                    <option value="EMPHASIS">Emphasis</option>
                    <option value="PITCH_RISE">Pitch Rise</option>
                    <option value="PITCH_FALL">Pitch Fall</option>
                  </select>

                  <input
                    type="number"
                    min={0}
                    value={annotation.startIndex}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        startIndex: Number(e.target.value),
                      })
                    }
                    placeholder="Start index"
                    className={inputClass}
                  />

                  <input
                    type="number"
                    min={0}
                    value={annotation.endIndex}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        endIndex: Number(e.target.value),
                      })
                    }
                    placeholder="End index"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => removeAnnotation(index)}
                    className="flex items-center justify-center rounded-xl border border-red-100 bg-white text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <input
                    value={annotation.annotationValue ?? ''}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        annotationValue: e.target.value || null,
                      })
                    }
                    placeholder="Giá trị annotation"
                    className={inputClass}
                  />

                  <input
                    value={annotation.explanation ?? ''}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        explanation: e.target.value || null,
                      })
                    }
                    placeholder="Giải thích"
                    className={inputClass}
                  />

                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={annotation.points ?? 1}
                    onChange={(e) =>
                      updateAnnotation(index, {
                        points: Number(e.target.value),
                      })
                    }
                    placeholder="Điểm"
                    className={inputClass}
                  />
                </div>
              </div>
            )
          )}
        </div>

        <AddButton onClick={addAnnotation}>Thêm annotation</AddButton>
      </Section>
    );
  };

  const renderWritingConfig = () => {
    if (!WRITING_TYPES.includes(question.questionType)) return null;

    if (question.questionType === 'ESSAY') {
      return (
        <Section
          title="Tự luận"
          description="Câu hỏi sẽ được Instructor chấm thủ công."
          icon={<FileText className="h-5 w-5" />}
        >
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            Dạng legacy ESSAY không yêu cầu cấu hình Script Writing.
          </div>
        </Section>
      );
    }

    const config = question.writingConfig ?? {};

    return (
      <Section
        title="Yêu cầu Script Writing"
        description="Thiết lập bối cảnh và giới hạn bài viết của learner."
        icon={<FileText className="h-5 w-5" />}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Loại sự kiện">
            <input
              value={config.eventType ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  eventType: e.target.value || null,
                })
              }
              placeholder="Đám cưới, hội nghị..."
              className={inputClass}
            />
          </Field>

          <Field label="Đối tượng khán giả">
            <input
              value={config.audience ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  audience: e.target.value || null,
                })
              }
              placeholder="Khách mời, sinh viên..."
              className={inputClass}
            />
          </Field>

          <Field label="Phong cách">
            <input
              value={config.style ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  style: e.target.value || null,
                })
              }
              placeholder="Trang trọng, trẻ trung..."
              className={inputClass}
            />
          </Field>

          <Field label="Số từ tối thiểu">
            <input
              type="number"
              min={0}
              value={config.minWords ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  minWords: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className={inputClass}
            />
          </Field>

          <Field label="Số từ tối đa">
            <input
              type="number"
              min={0}
              value={config.maxWords ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  maxWords: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Required Elements JSON">
            <textarea
              value={config.requiredElementsJson ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  requiredElementsJson: e.target.value || null,
                })
              }
              rows={4}
              placeholder='["Lời chào","Giới thiệu sự kiện"]'
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </Field>

          <Field label="Grading Rubric JSON">
            <textarea
              value={config.gradingRubricJson ?? ''}
              onChange={(e) =>
                updateWritingConfig({
                  gradingRubricJson: e.target.value || null,
                })
              }
              rows={4}
              placeholder='{"content":50,"style":50}'
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </Field>
        </div>
      </Section>
    );
  };

  const renderArrange = () => {
    if (question.questionType !== 'ARRANGE_SCRIPT') return null;

    return (
      <Section
        title="Các đoạn cần sắp xếp"
        description="Thứ tự đang hiển thị chính là thứ tự đúng. Có thể thêm distractor."
        icon={<ListChecks className="h-5 w-5" />}
      >
        <div className="space-y-3">
          {(question.arrangeItems ?? []).map(
            (item: any, index: number) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
                  {index + 1}
                </span>

                <input
                  value={item.content}
                  onChange={(e) =>
                    updateArrangeItem(index, {
                      content: e.target.value,
                    })
                  }
                  placeholder="Nội dung đoạn script..."
                  className={`${inputClass} flex-1`}
                />

                <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={item.isDistractor}
                    onChange={(e) =>
                      updateArrangeItem(index, {
                        isDistractor: e.target.checked,
                        correctOrder: e.target.checked
                          ? null
                          : index + 1,
                      })
                    }
                    className="accent-blue-600"
                  />
                  Distractor
                </label>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveArrangeItem(index, -1)}
                    className="rounded-lg border bg-white p-2 text-slate-500"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveArrangeItem(index, 1)}
                    className="rounded-lg border bg-white p-2 text-slate-500"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeArrangeItem(index)}
                    className="rounded-lg border border-red-100 bg-white p-2 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <AddButton onClick={addArrangeItem}>Thêm đoạn</AddButton>
      </Section>
    );
  };

  const renderScenario = () => {
    if (question.questionType !== 'SCENARIO_DECISION_TREE') return null;

    const nodes = question.scenarioNodes ?? [];

    return (
      <Section
        title="Scenario Decision Tree"
        description="Tạo các node và nối lựa chọn sang node tiếp theo bằng Client Key."
        icon={<GitBranch className="h-5 w-5" />}
      >
        <div className="space-y-5">
          {nodes.map((node: any, nodeIndex: number) => (
            <div
              key={node.clientKey ?? nodeIndex}
              className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-indigo-800">
                    Node {nodeIndex + 1}
                  </p>
                  <p className="mt-1 text-xs text-indigo-500">
                    Client Key: {node.clientKey}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={nodes.length <= 2}
                  onClick={() => removeScenarioNode(nodeIndex)}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Client Key">
                  <input
                    value={node.clientKey ?? ''}
                    onChange={(e) =>
                      updateScenarioNode(nodeIndex, {
                        clientKey: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Loại node">
                  <select
                    value={node.nodeType}
                    onChange={(e) =>
                      updateScenarioNode(nodeIndex, {
                        nodeType: e.target.value as ScenarioNodeType,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="SITUATION">Situation</option>
                    <option value="QUESTION">Question</option>
                    <option value="INFORMATION">Information</option>
                    <option value="RESULT">Result</option>
                  </select>
                </Field>

                <Field label="Tiêu đề">
                  <input
                    value={node.title ?? ''}
                    onChange={(e) =>
                      updateScenarioNode(nodeIndex, {
                        title: e.target.value || null,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Media URL">
                  <input
                    value={node.mediaUrl ?? ''}
                    onChange={(e) =>
                      updateScenarioNode(nodeIndex, {
                        mediaUrl: e.target.value || null,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Nội dung">
                <textarea
                  value={node.content}
                  onChange={(e) =>
                    updateScenarioNode(nodeIndex, {
                      content: e.target.value,
                    })
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              <div className="mt-3 flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={node.isStartNode}
                    onChange={(e) => {
                      const checked = e.target.checked;

                      update(
                        'scenarioNodes',
                        nodes.map((item: any, i: number) => ({
                          ...item,
                          isStartNode:
                            i === nodeIndex
                              ? checked
                              : checked
                                ? false
                                : item.isStartNode,
                        }))
                      );
                    }}
                    className="accent-blue-600"
                  />
                  Start Node
                </label>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={node.isEndNode}
                    onChange={(e) =>
                      updateScenarioNode(nodeIndex, {
                        isEndNode: e.target.checked,
                        choices: e.target.checked ? [] : node.choices,
                      })
                    }
                    className="accent-blue-600"
                  />
                  End Node
                </label>
              </div>

              {!node.isEndNode && (
                <div className="mt-5 border-t border-indigo-100 pt-4">
                  <p className="mb-3 text-sm font-bold text-slate-700">
                    Lựa chọn
                  </p>

                  <div className="space-y-3">
                    {(node.choices ?? []).map(
                      (choice: any, choiceIndex: number) => (
                        <div
                          key={choiceIndex}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Nội dung lựa chọn">
                              <input
                                value={choice.choiceText}
                                onChange={(e) =>
                                  updateScenarioChoice(
                                    nodeIndex,
                                    choiceIndex,
                                    {
                                      choiceText: e.target.value,
                                    }
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Đi tới node">
                              <select
                                value={
                                  choice.nextNodeClientKey ?? ''
                                }
                                onChange={(e) =>
                                  updateScenarioChoice(
                                    nodeIndex,
                                    choiceIndex,
                                    {
                                      nextNodeClientKey:
                                        e.target.value || null,
                                    }
                                  )
                                }
                                className={inputClass}
                              >
                                <option value="">
                                  -- Không có node tiếp theo --
                                </option>
                                {nodes
                                  .filter(
                                    (other: any) =>
                                      other.clientKey !==
                                      node.clientKey
                                  )
                                  .map((other: any) => (
                                    <option
                                      key={other.clientKey}
                                      value={other.clientKey}
                                    >
                                      {other.clientKey}
                                      {other.title
                                        ? ` - ${other.title}`
                                        : ''}
                                    </option>
                                  ))}
                              </select>
                            </Field>

                            <Field label="Điểm">
                              <input
                                type="number"
                                step="0.01"
                                value={choice.score ?? 0}
                                onChange={(e) =>
                                  updateScenarioChoice(
                                    nodeIndex,
                                    choiceIndex,
                                    {
                                      score: Number(
                                        e.target.value
                                      ),
                                    }
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Feedback">
                              <input
                                value={choice.feedback ?? ''}
                                onChange={(e) =>
                                  updateScenarioChoice(
                                    nodeIndex,
                                    choiceIndex,
                                    {
                                      feedback:
                                        e.target.value || null,
                                    }
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeScenarioChoice(
                                nodeIndex,
                                choiceIndex
                              )
                            }
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa lựa chọn
                          </button>
                        </div>
                      )
                    )}
                  </div>

                  <AddButton
                    onClick={() =>
                      addScenarioChoice(nodeIndex)
                    }
                  >
                    Thêm lựa chọn
                  </AddButton>
                </div>
              )}
            </div>
          ))}
        </div>

        <AddButton onClick={addScenarioNode}>
          Thêm scenario node
        </AddButton>
      </Section>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Question {questionNumber}
          </p>
          <h3 className="mt-1 font-bold text-slate-900">
            Câu hỏi {questionNumber}
          </h3>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Xóa câu
          </button>
        )}
      </div>

      <div className="space-y-6 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Dạng câu hỏi">
            <select
              value={question.questionType}
              onChange={(e) =>
                handleTypeChange(
                  e.target.value as QuestionType
                )
              }
              className={inputClass}
            >
              {[
                'Knowledge Quiz',
                'Listening',
                'Script',
                'Scenario',
                'Legacy',
              ].map((group) => (
                <optgroup key={group} label={group}>
                  {QUESTION_TYPES.filter(
                    (item) => item.group === group
                  ).map((item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Field label="Điểm">
            <input
              type="number"
              min={0}
              step="0.01"
              value={question.points ?? 1}
              onChange={(e) =>
                update(
                  'points',
                  Math.max(0, Number(e.target.value))
                )
              }
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Nội dung câu hỏi *">
          <textarea
            value={question.questionText}
            onChange={(e) =>
              update('questionText', e.target.value)
            }
            rows={3}
            placeholder={
              question.questionType ===
              'SCRIPT_ANNOTATION'
                ? 'Nhập script để learner đánh dấu...'
                : 'Nhập nội dung câu hỏi...'
            }
            className={`${inputClass} resize-none`}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hướng dẫn">
            <textarea
              value={question.instruction ?? ''}
              onChange={(e) =>
                update(
                  'instruction',
                  e.target.value || null
                )
              }
              rows={2}
              placeholder="Hướng dẫn learner cách làm..."
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Giải thích">
            <textarea
              value={question.explanation ?? ''}
              onChange={(e) =>
                update(
                  'explanation',
                  e.target.value || null
                )
              }
              rows={2}
              placeholder="Giải thích sau khi làm bài..."
              className={`${inputClass} resize-none`}
            />
          </Field>
        </div>

        <label className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={question.isRequired ?? true}
            onChange={(e) =>
              update('isRequired', e.target.checked)
            }
            className="h-4 w-4 accent-blue-600"
          />
          Câu hỏi bắt buộc
        </label>

        {question.questionType ===
          'ERROR_CORRECTION_LAB' && (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-800">
                Error Correction Lab
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-700">
                Instructor thiết lập vùng lỗi, nguyên nhân/mã
                lỗi và cách sửa. Nếu muốn kết hợp lựa chọn,
                có thể bổ sung choice sau khi backend/UI
                workflow được chốt.
              </p>
            </div>
          </div>
        )}

        {renderMedia()}
        {renderChoices()}
        {renderFillBlank()}
        {renderErrorRegions()}
        {renderAnnotations()}
        {renderWritingConfig()}
        {renderArrange()}
        {renderScenario()}
      </div>
    </div>
  );
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {label}
    </span>
    {children}
  </label>
);

const Section: React.FC<{
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-start gap-3">
      {icon && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      )}

      <div>
        <h4 className="text-sm font-extrabold text-slate-900">
          {title}
        </h4>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>

    {children}
  </section>
);

const AddButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
}> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2.5 text-xs font-bold text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
  >
    <Plus className="h-4 w-4" />
    {children}
  </button>
);

export default QuizQuestionEditor;