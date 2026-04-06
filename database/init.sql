SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS message_reactions;
DROP TABLE IF EXISTS message_reads;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chat_members;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users (
    id              VARCHAR(36)     NOT NULL,
    email           VARCHAR(100)    NOT NULL,
    username        VARCHAR(50)     NOT NULL,
    display_name    VARCHAR(100)    NOT NULL,
    avatar_url      VARCHAR(500)    NULL,
    bio             VARCHAR(300)    NULL,
    password_hash   VARCHAR(256)    NOT NULL,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    last_seen_at    DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email    (email),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chats (
    id              VARCHAR(36)                     NOT NULL,
    type            ENUM('private', 'group')        NOT NULL,
    name            VARCHAR(100)                    NULL,
    description     VARCHAR(500)                    NULL,
    avatar_url      VARCHAR(500)                    NULL,
    created_by      VARCHAR(36)                     NOT NULL,
    created_at      DATETIME                        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME                        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chats_created_by (created_by),
    CONSTRAINT fk_chats_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE chat_members (
    id              VARCHAR(36)                             NOT NULL,
    chat_id         VARCHAR(36)                             NOT NULL,
    user_id         VARCHAR(36)                             NOT NULL,
    role            ENUM('owner', 'admin', 'member')        NOT NULL DEFAULT 'member',
    joined_at       DATETIME                                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at         DATETIME                                NULL,
    muted_until     DATETIME                                NULL,
    PRIMARY KEY (id),
    KEY idx_chat_members_chat_id (chat_id),
    KEY idx_chat_members_user_id (user_id),
    CONSTRAINT fk_chat_members_chat FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_chat_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id              VARCHAR(36)                                                     NOT NULL,
    chat_id         VARCHAR(36)                                                     NOT NULL,
    sender_id       VARCHAR(36)                                                     NOT NULL,
    reply_to_id     VARCHAR(36)                                                     NULL,
    forwarded_from  VARCHAR(36)                                                     NULL,
    type            ENUM('text', 'image', 'file', 'voice', 'system')               NOT NULL DEFAULT 'text',
    content         TEXT                                                            NULL,
    is_edited       BOOLEAN                                                         NOT NULL DEFAULT FALSE,
    edited_at       DATETIME                                                        NULL,
    is_deleted      BOOLEAN                                                         NOT NULL DEFAULT FALSE,
    deleted_at      DATETIME                                                        NULL,
    sent_at         DATETIME                                                        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_messages_chat_id   (chat_id),
    KEY idx_messages_sender_id (sender_id),
    KEY idx_messages_sent_at   (chat_id, sent_at DESC),
    CONSTRAINT fk_messages_chat     FOREIGN KEY (chat_id)     REFERENCES chats    (id) ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_messages_sender   FOREIGN KEY (sender_id)   REFERENCES users    (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attachments (
    id          VARCHAR(36)     NOT NULL,
    message_id  VARCHAR(36)     NOT NULL,
    file_name   VARCHAR(255)    NOT NULL,
    file_path   VARCHAR(500)    NOT NULL,
    file_size   BIGINT          NOT NULL,
    mime_type   VARCHAR(100)    NOT NULL,
    width       INT             NULL,
    height      INT             NULL,
    duration_ms INT             NULL,
    PRIMARY KEY (id),
    KEY idx_attachments_message_id (message_id),
    CONSTRAINT fk_attachments_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_reads (
    id          VARCHAR(36) NOT NULL,
    message_id  VARCHAR(36) NOT NULL,
    user_id     VARCHAR(36) NOT NULL,
    read_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_message_reads (message_id, user_id),
    KEY idx_message_reads_user_id (user_id),
    CONSTRAINT fk_message_reads_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_message_reads_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_reactions (
    id          VARCHAR(36)  NOT NULL,
    message_id  VARCHAR(36)  NOT NULL,
    user_id     VARCHAR(36)  NOT NULL,
    emoji       VARCHAR(10)  NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_message_reactions (message_id, user_id, emoji),
    CONSTRAINT fk_message_reactions_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_message_reactions_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
    id          VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    token       VARCHAR(512)    NOT NULL,
    expires_at  DATETIME        NOT NULL,
    revoked_at  DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_refresh_tokens_token (token),
    KEY idx_refresh_tokens_user_id (user_id),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_verifications (
    id          VARCHAR(36)     NOT NULL,
    user_id     VARCHAR(36)     NOT NULL,
    token       VARCHAR(256)    NOT NULL,
    expires_at  DATETIME        NOT NULL,
    used_at     DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_email_verifications_token (token),
    KEY idx_email_verifications_user_id (user_id),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
