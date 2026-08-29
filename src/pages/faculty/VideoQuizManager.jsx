import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Trash2, Plus, Play, Pause, Users, FileText, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactPlayer from 'react-player';
const Player = ReactPlayer.default ? ReactPlayer.default : ReactPlayer;

import * as contentApi from '../../api/content';
import client, { extractErrorMessages, buildStaticUrl } from '../../api/client';
import Button from '../../components/ui/Button';
import Input, { Field, Select, Textarea } from '../../components/ui/Input';
import PageLoader from '../../components/ui/PageLoader';
import Tabs from '../../components/ui/Tabs';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const getPlayerUrl = (url) => {
  if (!url) return '';
  let trimmed = url.trim();
  if (trimmed.toLowerCase().startsWith('<iframe')) {
    const match = trimmed.match(/src=["'](.*?)["']/);
    if (match && match[1]) trimmed = match[1];
  }

  if (trimmed.includes('youtube.com/embed/')) {
    const videoId = trimmed.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    trimmed = `https://www.youtube.com/watch?v=${videoId}`;
  } else if (trimmed.includes('player.vimeo.com/video/')) {
    const videoId = trimmed.split('player.vimeo.com/video/')[1].split(/[?#]/)[0];
    trimmed = `https://vimeo.com/${videoId}`;
  } else if (trimmed.includes('youtube.com/watch')) {
    try {
      const videoId = new URL(trimmed.startsWith('http') ? trimmed : 'https://' + trimmed).searchParams.get('v');
      if (videoId) trimmed = `https://www.youtube.com/watch?v=${videoId}`;
    } catch (e) { }
  } else if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1].split(/[?#]/)[0];
    trimmed = `https://www.youtube.com/watch?v=${videoId}`;
  }

  if (trimmed.startsWith('www.')) trimmed = 'https://' + trimmed;
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
    if (!trimmed.startsWith('http')) trimmed = 'https://' + trimmed;
  }
  if (trimmed.startsWith('http')) return trimmed;
  return buildStaticUrl(trimmed);
};

export default function VideoQuizManager() {
  const { id: courseId, lessonId } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/faculty') ? '/faculty' : '/admin';

  const [lesson, setLesson] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes');
  const [deleteId, setDeleteId] = useState(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ timestampSeconds: 0, questionText: '', options: ['', ''], correctAnswerIndex: 0 });

  const loadQuizzes = async () => {
    try {
      const [res, ansRes] = await Promise.all([
        client.get(`/courses/${courseId}/content/modules/${lesson?.moduleId}/lessons/${lessonId}/video-quizzes`),
        client.get(`/courses/${courseId}/content/modules/${lesson?.moduleId}/lessons/${lessonId}/video-quizzes/answers`)
      ]);
      setQuizzes(res.data?.data || []);
      setAnswers(ansRes.data?.data || []);
    } catch (err) { }
  };

  useEffect(() => {
    if (location.state?.lesson) {
      setLesson(location.state.lesson);
      setLoading(false);
    } else {
      // Fetch modules and find lesson if user navigates directly to URL
      const fetchLesson = async () => {
        try {
          const modRes = await contentApi.listModules(courseId);
          const modules = modRes.data?.data || [];
          for (const mod of modules) {
            const lesRes = await contentApi.listLessons(courseId, mod._id || mod.id);
            const lessons = lesRes.data?.data || [];
            const found = lessons.find(l => (l._id || l.id) === lessonId);
            if (found) {
              setLesson({ ...found, moduleId: mod._id || mod.id });
              setLoading(false);
              return;
            }
          }
          toast.error('Lesson not found.');
          setLoading(false);
        } catch (err) {
          toast.error('Failed to load lesson.');
          setLoading(false);
        }
      };
      fetchLesson();
    }
  }, [location.state, courseId, lessonId]);

  useEffect(() => {
    if (lesson) loadQuizzes();
  }, [lesson]);

  const handleProgress = (state) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleAddQuiz = () => {
    setPlaying(false);
    setForm({
      timestampSeconds: Math.floor(currentTime),
      type: 'MCQ',
      questionText: '',
      options: ['', ''],
      correctAnswerIndex: 0,
      maxMarks: 1
    });
    setShowForm(true);
  };

  const submitQuiz = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        timestampSeconds: form.timestampSeconds,
        type: form.type,
        questionText: form.questionText,
        maxMarks: Number(form.maxMarks),
      };

      if (form.type !== 'THEORY') {
        payload.options = form.options.map((t, i) => ({ text: t, isCorrect: i === Number(form.correctAnswerIndex) }));
        payload.correctAnswer = form.options[form.correctAnswerIndex];
      }
      await client.post(`/courses/${courseId}/content/modules/${lesson.moduleId}/lessons/${lessonId}/video-quizzes`, payload);
      toast.success('Quiz added');
      setShowForm(false);
      loadQuizzes();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    } finally {
      setSaving(false);
    }
  };

  const deleteQuiz = async (quizId) => {
    try {
      await client.delete(`/courses/${courseId}/content/modules/${lesson.moduleId}/lessons/${lessonId}/video-quizzes/${quizId}`);
      toast.success('Quiz deleted');
      loadQuizzes();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  const gradeAnswer = async (answerId, marks) => {
    try {
      await client.post(`/courses/ignore/content/video-quizzes/answers/${answerId}/grade`, { marks });
      toast.success('Grade saved');
      loadQuizzes();
    } catch (err) {
      extractErrorMessages(err).forEach(m => toast.error(m));
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <PageLoader />;
  if (!lesson) return <div className="page">Lesson not found.</div>;

  return (
    <div className="page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
      <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
        <Link to={`${base}/courses/${courseId}`} className="row text-muted" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Course
        </Link>
        <h1 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>Manage Video Quizzes: {lesson.title}</h1>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Side: Player */}
        <div style={{ flex: 1, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-6)' }}>
          <div style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9', position: 'relative' }}>
            {Player && (
              <Player
                ref={playerRef}
                url={getPlayerUrl(lesson.videoUrl)}
                controls
                playing={playing}
                onProgress={handleProgress}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                width="100%"
                height="100%"
              />
            )}
          </div>
          {/* <p style={{ color: 'red', marginTop: '10px' }}>DEBUG URL: {getPlayerUrl(lesson.videoUrl)}</p> */}
          <div className="row" style={{ marginTop: 'var(--sp-6)', gap: 'var(--sp-4)' }}>
            <div style={{ color: '#fff', fontSize: 'var(--fs-lg)', fontFamily: 'monospace' }}>
              {formatTime(currentTime)}
            </div>
            <Button onClick={handleAddQuiz} icon={Plus} disabled={showForm}>Add Quiz at Current Time</Button>
          </div>
        </div>

        {/* Right Side: Sidebar */}
        <div style={{ width: '400px', background: 'var(--color-paper)', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '0 var(--sp-4)', borderBottom: '1px solid var(--border-subtle)' }}>
            <Tabs
              tabs={[
                { key: 'quizzes', label: 'Manage Quizzes', icon: FileText },
                { key: 'responses', label: 'Student Responses', icon: Users }
              ]}
              active={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'quizzes' && (
              <>
                {showForm ? (
                  <form onSubmit={submitQuiz} className="stack" style={{ padding: 'var(--sp-5)' }}>
                    <h3 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-2)' }}>Add Quiz at {formatTime(form.timestampSeconds)}</h3>

                    <Field label="Question Type" required>
                      <Select value={form.type} onChange={e => {
                        const newType = e.target.value;
                        setForm(f => ({
                          ...f,
                          type: newType,
                          options: newType === 'TRUE_FALSE' ? ['True', 'False'] : (f.options.length < 2 ? ['', ''] : f.options),
                          correctAnswerIndex: newType === 'TRUE_FALSE' && f.correctAnswerIndex > 1 ? 0 : f.correctAnswerIndex
                        }));
                      }}>
                        <option value="MCQ">Multiple Choice</option>
                        <option value="TRUE_FALSE">True / False</option>
                        {/* <option value="THEORY">Theory (Short Answer)</option> */}
                      </Select>
                    </Field>

                    <Field label="Question" required>
                      <Textarea value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} required />
                    </Field>

                    <Field label="Max Marks">
                      <Input type="number" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} required />
                    </Field>

                    {form.type !== 'THEORY' && (
                      <>
                        <p style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Options (Select the correct one)</p>
                        {form.options.map((opt, i) => (
                          <div key={i} className="row" style={{ gap: 'var(--sp-2)' }}>
                            <input type="radio" name="correctAnswer" checked={form.correctAnswerIndex === i} onChange={() => setForm(f => ({ ...f, correctAnswerIndex: i }))} style={{ marginTop: 10 }} />
                            <Input value={opt} onChange={e => {
                              const newOpts = [...form.options];
                              newOpts[i] = e.target.value;
                              setForm(f => ({ ...f, options: newOpts }));
                            }} placeholder={`Option ${i + 1}`} style={{ flex: 1 }} required disabled={form.type === 'TRUE_FALSE'} />
                            {form.type !== 'TRUE_FALSE' && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }))}>X</Button>
                            )}
                          </div>
                        ))}
                        {form.type !== 'TRUE_FALSE' && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, options: [...f.options, ''] }))}>Add Option</Button>
                        )}
                      </>
                    )}

                    <div className="row" style={{ marginTop: 'var(--sp-6)', gap: 'var(--sp-4)' }}>
                      <Button type="button" variant="outline" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Button>
                      <Button type="submit" loading={saving} style={{ flex: 1 }}>Save</Button>
                    </div>
                  </form>
                ) : (
                  <div style={{ padding: 'var(--sp-5)' }}>
                    <h3 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-4)' }}>Quizzes ({quizzes.length})</h3>
                    {quizzes.length === 0 && <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>No quizzes added yet. Pause the video and click 'Add Quiz' to insert one.</p>}

                    <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                      {quizzes.map((q) => (
                        <div key={q._id || q.id} style={{ padding: 'var(--sp-4)', background: 'var(--color-paper-50)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--color-primary-700)', fontSize: 'var(--fs-sm)' }}>
                              @ {formatTime(q.timestampSeconds)}
                              <span style={{ marginLeft: 8, padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', fontSize: '10px' }}>{q.type}</span>
                            </span>
                            <div className="row">
                              <Button size="sm" variant="ghost" icon={Play} onClick={() => { playerRef.current?.seekTo(q.timestampSeconds); setPlaying(true); }} />
                              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setDeleteId(q._id || q.id)} />
                            </div>
                          </div>
                          <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>{q.questionText}</p>
                          
                          {/* Options List */}
                          {(() => {
                            let rawOpts = q.options;
                            if (typeof rawOpts === 'string') {
                              try { rawOpts = JSON.parse(rawOpts); } catch (e) { rawOpts = []; }
                            }
                            if (!Array.isArray(rawOpts) || rawOpts.length === 0) return null;

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                                {rawOpts.map((opt, idx) => {
                                  const optText = typeof opt === 'object' && opt !== null ? opt.text : opt;
                                  const isCorrect = (typeof opt === 'object' && opt !== null && opt.isCorrect) || 
                                                    (q.correctAnswer && (q.correctAnswer === optText || q.correctAnswer === String.fromCharCode(65 + idx)));

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        background: isCorrect ? '#ecfdf5' : '#ffffff',
                                        border: isCorrect ? '1px solid #10b981' : '1px solid var(--border-subtle, #e2e8f0)',
                                        color: isCorrect ? '#065f46' : 'var(--text-primary)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontWeight: 700, minWidth: '16px', color: isCorrect ? '#10b981' : 'var(--text-muted)' }}>
                                          {String.fromCharCode(65 + idx)}.
                                        </span>
                                        <span style={{ fontWeight: isCorrect ? 600 : 400 }}>{optText}</span>
                                      </div>
                                      {isCorrect && (
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                          ✓ Correct
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'responses' && (
              <div style={{ padding: 'var(--sp-5)' }}>
                <h3 style={{ fontSize: 'var(--fs-lg)', marginBottom: 'var(--sp-4)' }}>Student Answers</h3>
                {answers.length === 0 && <p className="text-muted" style={{ fontSize: 'var(--fs-sm)' }}>No answers submitted yet.</p>}

                <div className="stack" style={{ gap: 'var(--sp-4)' }}>
                  {answers.map(ans => (
                    <div key={ans._id || ans.id} style={{ padding: 'var(--sp-4)', background: 'var(--color-paper-50)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{ans.studentId?.fullName}</span>
                        {ans.isGraded ? (
                          <span style={{ color: ans.isCorrect ? 'var(--success)' : 'var(--color-primary-700)', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                            {ans.marks} / {ans.quizId?.maxMarks} Marks
                          </span>
                        ) : (
                          <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Needs Grading</span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-text-light)', marginBottom: 'var(--sp-2)' }}>Q: {ans.quizId?.questionText}</p>

                      <div style={{ background: '#fff', padding: 'var(--sp-3)', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-3)' }}>
                        <span style={{ fontWeight: 600 }}>Answer:</span> {ans.selectedOption || ans.textAnswer}
                      </div>

                      {!ans.isGraded && ans.quizId?.type === 'THEORY' && (
                        <div className="row" style={{ gap: 'var(--sp-2)' }}>
                          <Input type="number" placeholder="Marks" id={`marks-${ans._id || ans.id}`} style={{ width: '80px' }} />
                          <Button size="sm" onClick={() => {
                            const val = document.getElementById(`marks-${ans._id || ans.id}`).value;
                            gradeAnswer(ans._id || ans.id, Number(val));
                          }}>Save Grade</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ConfirmDialog
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={() => {
              deleteQuiz(deleteId);
              setDeleteId(null);
            }}
            title="Delete Video Quiz"
            description="Are you sure you want to delete this video quiz? This action cannot be undone."
            confirmLabel="Delete"
            danger={true}
          />
        </div>
      </div>
    </div>
  );
}
