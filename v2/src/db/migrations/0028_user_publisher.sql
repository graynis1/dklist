-- Publisher "Takip Et" button on /yayinevi/[slug] was dead UI (no onClick,
-- no backing feature) - v1 has no publisher-follow concept either, but the
-- button was already in the page from earlier scaffolding. Rather than
-- delete it, wire it to a real feature using the exact same Like pattern
-- already built for writers/translators (user_writer/user_translator) -
-- this is a genuinely new ManyToMany, not a v1 port. Local shadow DB only,
-- not applied to production without the maintainer's separate go-ahead.
CREATE TABLE user_publisher (
  user_id INT NOT NULL,
  publisher_id INT NOT NULL,
  PRIMARY KEY (user_id, publisher_id),
  KEY idx_user_publisher_user (user_id),
  KEY idx_user_publisher_publisher (publisher_id),
  CONSTRAINT fk_user_publisher_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_publisher_publisher FOREIGN KEY (publisher_id) REFERENCES publisher(id) ON DELETE CASCADE
);
