import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { BaseFactory } from "../../src/base-factory";
import { Seeder } from "../../src/interfaces/seeder.interface";
import type { Faker } from "@faker-js/faker";
import type { FactoryService } from "../../src/factory.service";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ default: "user" })
  role!: string;

  @Column({ type: "int", default: 25 })
  age!: number;

  @Column({ default: true })
  active!: boolean;
}

@Entity("posts")
export class Post {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column({ default: "draft" })
  status!: string;

  @Column({ nullable: true })
  userId!: string;
}

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  body!: string;

  @Column({ nullable: true })
  postId!: string;
}

export class UserFactory extends BaseFactory<User> {
  get entity() {
    return User;
  }

  definition(faker: Faker): Partial<User> {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "user",
      age: faker.number.int({ min: 18, max: 65 }),
      active: true,
    };
  }

  admin(): Partial<User> {
    return { role: "admin" };
  }

  inactive(): Partial<User> {
    return { active: false };
  }
}

export class PostFactory extends BaseFactory<Post> {
  get entity() {
    return Post;
  }

  definition(faker: Faker): Partial<Post> {
    return {
      title: faker.lorem.sentence(),
      body: faker.lorem.paragraphs(2),
      status: "draft",
    };
  }

  published(): Partial<Post> {
    return { status: "published" };
  }
}

export class CommentFactory extends BaseFactory<Comment> {
  get entity() {
    return Comment;
  }

  definition(faker: Faker): Partial<Comment> {
    return {
      body: faker.lorem.sentence(),
    };
  }
}

export class UserFactoryWithHooks extends BaseFactory<User> {
  get entity() {
    return User;
  }

  definition(faker: Faker): Partial<User> {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      role: "user",
      age: faker.number.int({ min: 18, max: 65 }),
      active: true,
    };
  }

  async afterMake(entity: User): Promise<void> {
    entity.name = `[made] ${entity.name}`;
  }

  async afterCreate(entity: User): Promise<void> {
    entity.name = `[created] ${entity.name}`;
  }
}

export class DatabaseSeeder implements Seeder {
  order = 0;

  async run(factory: FactoryService): Promise<void> {
    await factory.use(UserFactory).count(3).create();
    await factory.use(PostFactory).count(2).create();
  }
}

export class SecondarySeeder implements Seeder {
  order = 10;

  async run(factory: FactoryService): Promise<void> {
    await factory.use(CommentFactory).count(2).create();
  }
}
