-- ============================================================
-- FOLLOWS -> users.followers_count / following_count
-- Keeps profile counters in sync without the API having to
-- increment/decrement them manually on every follow/unfollow.
-- Only counts a follow once it's no longer pending (accepted).
-- ============================================================
CREATE OR REPLACE FUNCTION fn_follow_counts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- new follow row created directly as accepted (not a request)
    IF NEW.is_pending = false THEN
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- follow request just got accepted -> counters go up now
    IF OLD.is_pending = true AND NEW.is_pending = false THEN
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    -- edge case: accepted follow flipped back to pending
    ELSIF OLD.is_pending = false AND NEW.is_pending = true THEN
      UPDATE users SET following_count = following_count - 1 WHERE id = NEW.follower_id;
      UPDATE users SET followers_count = followers_count - 1 WHERE id = NEW.following_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- unfollow, or a follow request being cancelled/removed
    IF OLD.is_pending = false THEN
      UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
      UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_follow_counts ON follows;
CREATE TRIGGER trg_follow_counts
AFTER INSERT OR UPDATE OF is_pending OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION fn_follow_counts();


-- ============================================================
-- POSTS -> users.posts_count
-- Only "active" posts count toward the profile's post count.
-- Hiding/soft-deleting a post (or restoring it) adjusts the
-- counter automatically instead of relying on the API to do it.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_post_count_on_user()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' THEN
      UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- post went from visible to hidden/deleted
    IF OLD.status = 'active' AND NEW.status <> 'active' THEN
      UPDATE users SET posts_count = posts_count - 1 WHERE id = NEW.user_id;
    -- post got restored back to active
    ELSIF OLD.status <> 'active' AND NEW.status = 'active' THEN
      UPDATE users SET posts_count = posts_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- hard delete of a row that was still active
    IF OLD.status = 'active' THEN
      UPDATE users SET posts_count = posts_count - 1 WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_count_on_user ON posts;
CREATE TRIGGER trg_post_count_on_user
AFTER INSERT OR UPDATE OF status OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION fn_post_count_on_user();


-- ============================================================
-- POSTS (repost rows) -> original post's repost_count
-- A repost is itself a row in "posts" with post_type = 'repost'
-- and repost_of_id pointing at the original. This keeps the
-- original post's repost_count accurate as reposts are
-- created, hidden/deleted, or restored.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_repost_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.post_type = 'repost' AND NEW.repost_of_id IS NOT NULL AND NEW.status = 'active' THEN
      UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.post_type = 'repost' AND NEW.repost_of_id IS NOT NULL THEN
      -- repost got hidden/deleted -> original loses one repost
      IF OLD.status = 'active' AND NEW.status <> 'active' THEN
        UPDATE posts SET repost_count = repost_count - 1 WHERE id = NEW.repost_of_id;
      -- repost got restored -> original gains it back
      ELSIF OLD.status <> 'active' AND NEW.status = 'active' THEN
        UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.repost_of_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.post_type = 'repost' AND OLD.repost_of_id IS NOT NULL AND OLD.status = 'active' THEN
      UPDATE posts SET repost_count = repost_count - 1 WHERE id = OLD.repost_of_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_repost_count ON posts;
CREATE TRIGGER trg_repost_count
AFTER INSERT OR UPDATE OF status OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION fn_repost_count();


-- ============================================================
-- POST_LIKES -> posts.like_count
-- Straightforward join-table counter: one row per like.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_post_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_like_count ON post_likes;
CREATE TRIGGER trg_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION fn_post_like_count();


-- ============================================================
-- COMMENT_LIKES -> comments.like_count
-- Same pattern as post likes, scoped to comments instead.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_comment_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_like_count ON comment_likes;
CREATE TRIGGER trg_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION fn_comment_like_count();


-- ============================================================
-- COMMENTS -> posts.comment_count and parent comment's reply_count
-- A comment bumps its post's comment_count, and if it's a reply
-- (parent_comment_id set) it also bumps the parent's reply_count.
-- Soft-delete (is_deleted flag) is treated the same as removal:
-- both counters go back down, and flipping is_deleted back to
-- false restores them.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_comment_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_deleted = false THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
      IF NEW.parent_comment_id IS NOT NULL THEN
        UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- comment soft-deleted
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = NEW.post_id;
      IF NEW.parent_comment_id IS NOT NULL THEN
        UPDATE comments SET reply_count = reply_count - 1 WHERE id = NEW.parent_comment_id;
      END IF;
    -- comment restored
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
      IF NEW.parent_comment_id IS NOT NULL THEN
        UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.parent_comment_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- hard delete of a row that was still counted (not already soft-deleted)
    IF OLD.is_deleted = false THEN
      UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
      IF OLD.parent_comment_id IS NOT NULL THEN
        UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.parent_comment_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_count ON comments;
CREATE TRIGGER trg_comment_count
AFTER INSERT OR UPDATE OF is_deleted OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION fn_comment_count();


-- ============================================================
-- POST_HASHTAGS -> hashtags.posts_count
-- Tracks how many posts currently use a given hashtag, so
-- trending/search queries don't need to COUNT() the join table.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_hashtag_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE hashtags SET posts_count = posts_count + 1 WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE hashtags SET posts_count = posts_count - 1 WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hashtag_count ON post_hashtags;
CREATE TRIGGER trg_hashtag_count
AFTER INSERT OR DELETE ON post_hashtags
FOR EACH ROW EXECUTE FUNCTION fn_hashtag_count();


-- ============================================================
-- MESSAGES -> conversations.updated_at
-- Bumps the conversation's updated_at whenever a new message
-- lands, so the inbox list can just ORDER BY updated_at DESC
-- instead of joining against the latest message per conversation.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_bump_conversation_updated_at()
RETURNS trigger AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_conversation_updated_at ON messages;
CREATE TRIGGER trg_bump_conversation_updated_at
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_bump_conversation_updated_at();


-- ============================================================
-- USER_SANCTIONS -> users.status
-- Source of truth for "is this user banned/suspended" is the
-- user_sanctions table; users.status is just a denormalized
-- cache for fast lookups (login/permission checks) so the API
-- doesn't need to join against sanctions on every request.
-- This trigger keeps that cache correct no matter which code
-- path writes a sanction (admin panel, script, API, etc).
-- Priority: an active ban always wins over an active suspension.
-- If neither applies anymore, status falls back to 'active'
-- (never touches 'pending_verification', which isn't sanction-related).
-- Runs FOR UPDATE on the user row to avoid races if two sanctions
-- change at nearly the same time.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_sync_user_status_from_sanctions()
RETURNS trigger AS $$
DECLARE
  v_user_id BIGINT;
  v_has_active_ban BOOLEAN;
  v_has_active_suspension BOOLEAN;
  v_current_status "UserStatus";
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  SELECT status INTO v_current_status FROM users WHERE id = v_user_id FOR UPDATE;
  IF v_current_status IS NULL THEN
    RETURN NULL; -- user row not found, nothing to sync
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_sanctions WHERE user_id = v_user_id AND type = 'ban' AND status = 'active'
  ) INTO v_has_active_ban;

  -- a suspension only counts as "active" if it hasn't expired yet
  SELECT EXISTS (
    SELECT 1 FROM user_sanctions
    WHERE user_id = v_user_id AND type = 'suspension' AND status = 'active'
      AND expires_at > now()
  ) INTO v_has_active_suspension;

  IF v_has_active_ban THEN
    IF v_current_status IS DISTINCT FROM 'banned' THEN
      UPDATE users SET status = 'banned' WHERE id = v_user_id;
    END IF;
  ELSIF v_has_active_suspension THEN
    IF v_current_status IS DISTINCT FROM 'suspended' THEN
      UPDATE users SET status = 'suspended' WHERE id = v_user_id;
    END IF;
  ELSE
    -- no active ban or suspension left -> only reset if the current
    -- status was actually caused by a sanction in the first place
    IF v_current_status IN ('suspended', 'banned') THEN
      UPDATE users SET status = 'active' WHERE id = v_user_id;
    END IF;
  END IF;

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_status_on_sanction_change ON user_sanctions;
CREATE TRIGGER trg_sync_user_status_on_sanction_change
AFTER INSERT OR UPDATE OF status, type, expires_at OR DELETE ON user_sanctions
FOR EACH ROW EXECUTE FUNCTION fn_sync_user_status_from_sanctions();

-- ============================================================
-- Companion CHECK constraints — reject bad data at insert time
-- instead of relying on API validation alone.
-- ============================================================

-- a suspension must always have an expiry; open-ended punishment
-- should be modeled as a ban instead
ALTER TABLE user_sanctions
  ADD CONSTRAINT chk_suspension_has_expiry
  CHECK (type <> 'suspension' OR expires_at IS NOT NULL);

-- lifted_at / lifted_by_id must be set together with status = 'lifted',
-- and must both be empty otherwise — prevents half-filled lift records
ALTER TABLE user_sanctions
  ADD CONSTRAINT chk_lifted_fields_consistent
  CHECK (
    (status = 'lifted' AND lifted_at IS NOT NULL AND lifted_by_id IS NOT NULL)
    OR (status <> 'lifted' AND lifted_at IS NULL AND lifted_by_id IS NULL)
  );

-- if appeal_status is set, appealed_at must be set too
ALTER TABLE user_sanctions
  ADD CONSTRAINT chk_appeal_fields_consistent
  CHECK (appeal_status IS NULL OR appealed_at IS NOT NULL);

-- a user can't follow themselves
ALTER TABLE follows
  ADD CONSTRAINT chk_no_self_follow
  CHECK (follower_id <> following_id);

-- a user can't block themselves
ALTER TABLE user_blocks
  ADD CONSTRAINT chk_no_self_block
  CHECK (blocker_id <> blocked_id);