import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  files?: FileAttachment[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  lastMessage: Date;
}

const EXAMPLE_PROMPTS = [
  { icon: 'Calculator', text: 'Реши пример: 2x + 5 = 15' },
  { icon: 'BookOpen', text: 'Расскажи сказку про космонавта' },
  { icon: 'FileText', text: 'Напиши диплом по IT-безопасности' },
  { icon: 'ScrollText', text: 'Напиши реферат по истории' },
  { icon: 'Video', text: 'Создай видео с природой' },
  { icon: 'Sparkles', text: 'Придумай название для стартапа' },
];

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [currentTab, setCurrentTab] = useState('chat');
  const [currentChat, setCurrentChat] = useState<Chat>({
    id: '1',
    title: 'Новый чат',
    messages: [],
    lastMessage: new Date(),
  });
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [voiceType, setVoiceType] = useState<'male' | 'female' | 'child'>('female');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }

    const savedVoiceType = localStorage.getItem('voiceType') as 'male' | 'female' | 'child' | null;
    if (savedVoiceType) {
      setVoiceType(savedVoiceType);
    }

    const savedAutoSpeak = localStorage.getItem('autoSpeak');
    if (savedAutoSpeak !== null) {
      setAutoSpeak(savedAutoSpeak === 'true');
    }
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const handleVoiceTypeChange = (newVoiceType: 'male' | 'female' | 'child') => {
    setVoiceType(newVoiceType);
    localStorage.setItem('voiceType', newVoiceType);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';

      if (voiceType === 'male') {
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
      } else if (voiceType === 'female') {
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
      } else if (voiceType === 'child') {
        utterance.pitch = 1.5;
        utterance.rate = 1.1;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticated(true);
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim() && attachedFiles.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage || (attachedFiles.length > 0 ? 'Отправлены файлы' : ''),
      sender: 'user',
      timestamp: new Date(),
      files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    let aiResponseText = 'Привет! Я Kelan, ваш AI-ассистент.';
    
    if (attachedFiles.length > 0) {
      const imageCount = attachedFiles.filter(f => f.type.startsWith('image/')).length;
      const docCount = attachedFiles.filter(f => !f.type.startsWith('image/')).length;
      
      if (imageCount > 0 && docCount > 0) {
        aiResponseText = `Вижу ${imageCount} изображений и ${docCount} документов. Чем могу помочь с этими файлами?`;
      } else if (imageCount > 0) {
        aiResponseText = `Вижу ${imageCount} ${imageCount === 1 ? 'изображение' : 'изображений'}. Что нужно с ними сделать?`;
      } else {
        aiResponseText = `Получил ${docCount} ${docCount === 1 ? 'документ' : 'документов'}. Как могу помочь?`;
      }
    }

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText,
      sender: 'ai',
      timestamp: new Date(),
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, newMessage, aiResponse],
      lastMessage: new Date(),
    };

    setCurrentChat(updatedChat);
    setInputMessage('');
    setAttachedFiles([]);

    if (!chatHistory.find((c) => c.id === updatedChat.id)) {
      setChatHistory([updatedChat, ...chatHistory]);
    }

    if (autoSpeak) {
      setTimeout(() => speakText(aiResponse.text), 300);
    }
  };

  const handlePromptClick = (promptText: string) => {
    setInputMessage(promptText);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: FileAttachment[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Файл ${file.name} слишком большой (максимум 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newFiles.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: event.target.result as string,
          });

          if (newFiles.length === files.length) {
            setAttachedFiles([...attachedFiles, ...newFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-secondary opacity-50 blur-3xl"></div>
        <div className="absolute top-20 left-20 w-72 h-72 gradient-primary opacity-30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 gradient-accent opacity-20 rounded-full blur-3xl animate-pulse"></div>

        <Card className="w-full max-w-md p-8 glass-effect border-primary/20 relative z-10 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-block gradient-primary text-transparent bg-clip-text mb-2">
              <h1 className="text-5xl font-bold mb-2">Kelan</h1>
            </div>
            <p className="text-muted-foreground">Твой AI-ассистент нового поколения</p>
          </div>

          <Tabs value={isLogin ? 'login' : 'register'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" onClick={() => setIsLogin(true)}>
                Вход
              </TabsTrigger>
              <TabsTrigger value="register" onClick={() => setIsLogin(false)}>
                Регистрация
              </TabsTrigger>
            </TabsList>

            <TabsContent value={isLogin ? 'login' : 'register'}>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    className="bg-background/50 border-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Пароль"
                    className="bg-background/50 border-primary/20"
                    required
                  />
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Повторите пароль"
                      className="bg-background/50 border-primary/20"
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full gradient-primary hover:opacity-90 transition-opacity">
                  {isLogin ? 'Войти' : 'Зарегистрироваться'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 border-r border-border glass-effect flex flex-col animate-slide-in">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold gradient-primary text-transparent bg-clip-text">Kelan</h2>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <Button
              variant={currentTab === 'chat' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentTab('chat')}
            >
              <Icon name="MessageSquare" className="mr-2" size={20} />
              Чат
            </Button>
            <Button
              variant={currentTab === 'video' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentTab('video')}
            >
              <Icon name="Video" className="mr-2" size={20} />
              Генерация видео
            </Button>
            <Button
              variant={currentTab === 'history' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentTab('history')}
            >
              <Icon name="History" className="mr-2" size={20} />
              История
            </Button>
            <Button
              variant={currentTab === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => setCurrentTab('profile')}
            >
              <Icon name="User" className="mr-2" size={20} />
              Профиль
            </Button>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={() => setIsAuthenticated(false)}>
            <Icon name="LogOut" className="mr-2" size={20} />
            Выйти
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {currentTab === 'chat' && (
          <>
            {currentChat.messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
                <div className="max-w-4xl w-full space-y-8">
                  <div className="text-center space-y-4">
                    <h1 className="text-6xl font-bold gradient-primary text-transparent bg-clip-text">
                      Привет! Я Kelan
                    </h1>
                    <p className="text-xl text-muted-foreground">
                      Твой универсальный AI-ассистент для творчества и работы
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {EXAMPLE_PROMPTS.map((prompt, index) => (
                      <Card
                        key={index}
                        className="p-6 glass-effect border-primary/20 cursor-pointer hover:border-primary/50 transition-all hover:scale-105 group"
                        onClick={() => handlePromptClick(prompt.text)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Icon name={prompt.icon as any} size={20} className="text-white" />
                          </div>
                          <p className="text-sm flex-1">{prompt.text}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                  {currentChat.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <Avatar className={message.sender === 'ai' ? 'gradient-primary' : 'bg-muted'}>
                        <AvatarFallback>{message.sender === 'ai' ? 'K' : 'Я'}</AvatarFallback>
                      </Avatar>
                      <Card
                        className={`p-4 max-w-[70%] ${
                          message.sender === 'user'
                            ? 'gradient-primary text-white'
                            : 'glass-effect border-primary/20'
                        }`}
                      >
                        <div className="space-y-3">
                          {message.files && message.files.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {message.files.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  {file.type.startsWith('image/') ? (
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-32 object-cover rounded-lg"
                                    />
                                  ) : (
                                    <div className="w-full h-32 bg-background/50 rounded-lg flex flex-col items-center justify-center p-3">
                                      <Icon name="FileText" size={32} className="mb-2" />
                                      <p className="text-xs text-center truncate w-full">
                                        {file.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm flex-1">{message.text}</p>
                            {message.sender === 'ai' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => speakText(message.text)}
                              >
                                <Icon name="Volume2" size={16} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="border-t border-border p-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {isSpeaking && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Icon name="Volume2" size={16} className="animate-pulse" />
                    <span>Озвучивание...</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={stopSpeaking}
                      className="h-6 text-xs"
                    >
                      Остановить
                    </Button>
                  </div>
                )}
                
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg glass-effect border-primary/20">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="relative group bg-background/50 rounded-lg p-2 flex items-center gap-2"
                      >
                        {file.type.startsWith('image/') ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                            <Icon name="FileText" size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate max-w-[150px]">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removeFile(idx)}
                        >
                          <Icon name="X" size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4">
                  <Input
                    placeholder="Напишите сообщение..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-background/50 border-primary/20"
                  />
                  <Button onClick={handleSendMessage} className="gradient-primary hover:opacity-90">
                    <Icon name="Send" size={20} />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="border-primary/20"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="Paperclip" size={20} />
                  </Button>
                  <Button variant="outline" className="border-primary/20">
                    <Icon name="Smile" size={20} />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {currentTab === 'video' && (
          <div className="flex-1 flex items-center justify-center p-8 animate-fade-in">
            <div className="max-w-2xl w-full space-y-6">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 rounded-2xl gradient-accent mx-auto flex items-center justify-center mb-4">
                  <Icon name="Video" size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold">Генерация видео</h2>
                <p className="text-muted-foreground">Опишите видео, которое хотите создать</p>
              </div>

              <Card className="p-6 glass-effect border-primary/20">
                <div className="space-y-4">
                  <Input
                    placeholder="Например: Видео рассвета в горах..."
                    className="bg-background/50 border-primary/20"
                  />
                  <Button className="w-full gradient-accent hover:opacity-90">
                    <Icon name="Sparkles" className="mr-2" size={20} />
                    Создать видео
                  </Button>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 glass-effect border-primary/20">
                  <div className="aspect-video bg-muted rounded-lg mb-2"></div>
                  <p className="text-xs text-muted-foreground">Пример 1: Природа</p>
                </Card>
                <Card className="p-4 glass-effect border-primary/20">
                  <div className="aspect-video bg-muted rounded-lg mb-2"></div>
                  <p className="text-xs text-muted-foreground">Пример 2: Город</p>
                </Card>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'history' && (
          <div className="flex-1 p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold">История чатов</h2>
              {chatHistory.length === 0 ? (
                <Card className="p-12 glass-effect border-primary/20 text-center">
                  <Icon name="MessageSquare" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">История пуста. Начните новый чат!</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {chatHistory.map((chat) => (
                    <Card
                      key={chat.id}
                      className="p-6 glass-effect border-primary/20 cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02]"
                      onClick={() => {
                        setCurrentChat(chat);
                        setCurrentTab('chat');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{chat.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {chat.messages.length} сообщений
                          </p>
                        </div>
                        <Icon name="ChevronRight" size={20} className="text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="flex-1 p-8 animate-fade-in">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold">Профиль</h2>
              
              <Card className="p-6 glass-effect border-primary/20">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-bold">
                    Я
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Пользователь</h3>
                    <p className="text-sm text-muted-foreground">user@example.com</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-lg bg-background/50">
                    <span>Чатов создано</span>
                    <span className="font-semibold">{chatHistory.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-lg bg-background/50">
                    <span>Видео сгенерировано</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-lg bg-background/50">
                    <span>Сообщений отправлено</span>
                    <span className="font-semibold">
                      {chatHistory.reduce((acc, chat) => acc + chat.messages.length, 0)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 glass-effect border-primary/20">
                <h3 className="text-xl font-semibold mb-4">Настройки</h3>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Palette" size={18} />
                      Тема оформления
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className={theme === 'light' ? 'gradient-primary' : 'border-primary/20'}
                        onClick={() => handleThemeChange('light')}
                      >
                        <Icon name="Sun" className="mr-2" size={18} />
                        Светлая
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className={theme === 'dark' ? 'gradient-primary' : 'border-primary/20'}
                        onClick={() => handleThemeChange('dark')}
                      >
                        <Icon name="Moon" className="mr-2" size={18} />
                        Темная
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Icon name="Volume2" size={18} />
                      Тип голоса ассистента
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={voiceType === 'male' ? 'default' : 'outline'}
                        className={voiceType === 'male' ? 'gradient-secondary' : 'border-primary/20'}
                        onClick={() => handleVoiceTypeChange('male')}
                      >
                        <Icon name="User" className="mr-2" size={18} />
                        Мужской
                      </Button>
                      <Button
                        variant={voiceType === 'female' ? 'default' : 'outline'}
                        className={voiceType === 'female' ? 'gradient-secondary' : 'border-primary/20'}
                        onClick={() => handleVoiceTypeChange('female')}
                      >
                        <Icon name="UserRound" className="mr-2" size={18} />
                        Женский
                      </Button>
                      <Button
                        variant={voiceType === 'child' ? 'default' : 'outline'}
                        className={voiceType === 'child' ? 'gradient-secondary' : 'border-primary/20'}
                        onClick={() => handleVoiceTypeChange('child')}
                      >
                        <Icon name="Baby" className="mr-2" size={18} />
                        Детский
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                      <span className="text-xs text-muted-foreground">
                        Выбранный голос: {voiceType === 'male' ? 'Мужской' : voiceType === 'female' ? 'Женский' : 'Детский'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => speakText('Привет! Я Kelan, ваш AI-ассистент.')}
                        className="h-8"
                      >
                        <Icon name="Play" className="mr-2" size={14} />
                        Тест
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Icon name="Volume" size={18} />
                        Автоозвучка ответов
                      </label>
                      <Button
                        size="sm"
                        variant={autoSpeak ? 'default' : 'outline'}
                        className={autoSpeak ? 'gradient-accent' : 'border-primary/20'}
                        onClick={() => {
                          setAutoSpeak(!autoSpeak);
                          localStorage.setItem('autoSpeak', (!autoSpeak).toString());
                        }}
                      >
                        {autoSpeak ? 'Вкл' : 'Выкл'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {autoSpeak ? 'Ответы AI будут автоматически озвучиваться' : 'Озвучка по кнопке в сообщении'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}