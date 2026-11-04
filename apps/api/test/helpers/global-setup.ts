/**
 * Защита от случайного запуска интеграционных тестов на рабочей базе:
 * тесты очищают таблицы, поэтому имя базы должно заканчиваться на "_test".
 */
export default function globalSetup(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Integration tests need a migrated test database.');
  }

  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": ` +
        'the database name must end with "_test" because tests truncate all tables.',
    );
  }
}
