-- MusePath Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  instrument TEXT,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  goal_duration TEXT,
  daily_time TEXT,
  music_interests TEXT[],
  learning_mood TEXT,
  xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_practice_date DATE,
  total_practice_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEARNING PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  instrument TEXT NOT NULL,
  skill_level TEXT NOT NULL,
  goal_duration TEXT NOT NULL,
  daily_time TEXT NOT NULL,
  music_interests TEXT[],
  learning_mood TEXT,
  total_months INTEGER NOT NULL,
  plan_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  tips TEXT[],
  motivational_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEARNING WEEKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_weeks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_id UUID REFERENCES public.learning_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  month_number INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  topics TEXT[],
  skills TEXT[],
  practice_goal TEXT,
  practice_minutes INTEGER DEFAULT 0,
  milestone TEXT,
  youtube_searches TEXT[],
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRACTICE LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.practice_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.learning_plans(id) ON DELETE SET NULL,
  week_id UUID REFERENCES public.learning_weeks(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  mood TEXT,
  practiced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SONGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  genre TEXT,
  mood TEXT,
  why_recommended TEXT,
  skills_learned TEXT[],
  estimated_learning_time TEXT,
  spotify_id TEXT,
  spotify_url TEXT,
  preview_url TEXT,
  album_art TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RECOMMENDED VIDEOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.recommended_videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel TEXT,
  thumbnail TEXT,
  duration TEXT,
  instrument TEXT,
  difficulty TEXT,
  lesson_topic TEXT,
  watch_url TEXT,
  is_watched BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  month_number INTEGER,
  completed_weeks INTEGER DEFAULT 0,
  total_weeks INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED SONGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.saved_songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL,
  song_artist TEXT NOT NULL,
  difficulty TEXT,
  genre TEXT,
  why_recommended TEXT,
  skills_learned TEXT[],
  action TEXT CHECK (action IN ('save', 'add_to_plan', 'learn_later')) DEFAULT 'save',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_title, song_artist)
);

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  achievement_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  xp_reward INTEGER DEFAULT 50,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommended_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own plans" ON public.learning_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own weeks" ON public.learning_weeks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own logs" ON public.practice_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own videos" ON public.recommended_videos FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own progress" ON public.progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own saved songs" ON public.saved_songs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON public.achievements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Everyone can view songs" ON public.songs FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update streak function
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_practice_date INTO v_last_date FROM public.users WHERE id = p_user_id;
  
  IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
    -- Reset streak if missed a day
    UPDATE public.users 
    SET streak_days = CASE WHEN v_last_date = v_today - INTERVAL '1 day' THEN streak_days + 1 ELSE 1 END,
        last_practice_date = v_today
    WHERE id = p_user_id;
  ELSIF v_last_date < v_today THEN
    UPDATE public.users 
    SET streak_days = streak_days + 1,
        last_practice_date = v_today
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
