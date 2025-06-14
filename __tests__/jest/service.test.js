const axios = require("axios");
jest.mock("axios");
const {
  findOrCreateRoleWithName,
  createInvitation,
  findCategoryWithCourseName,
  findChannelWithId,
  msToMinutesAndSeconds,
  findOrCreateChannel,
  getCourseNameFromCategory,
  findChannelWithNameAndType,
  getWorkshopInfo } = require("../../src/discordBot/services/service");
const { createCourseToDatabase, removeCourseFromDb } = require("../../src/db/services/courseService");
const { data } = require("../mocks/workshopData.json");

const courses = [{ code: "tkt", fullName: "test course", name: "test" }];

const Course = {
  create: jest.fn(),
  findOne: jest
    .fn(() => true)
    .mockImplementationOnce(() => false)
    .mockImplementationOnce(() => false),
  findAll: jest.fn(() => courses),
  destroy: jest.fn(),
};

const { client } = require("../mocks/mockSlashClient");

afterEach(() => {
  jest.clearAllMocks();
});

describe("Service", () => {
  test("Get course name from category name", () => {
    const courseString = "test";
    const categoryName = "📚 test";
    const result = getCourseNameFromCategory(categoryName);
    expect(result).toBe(courseString);
  });

  test("Get course name from privateCategory name", () => {
    const courseString = "test";
    const privateCategoryName = "👻 test";
    const result = getCourseNameFromCategory(privateCategoryName);
    expect(result).toBe(courseString);
  });

  test("Can create a new role", async () => {
    const roleName = "test";
    await findOrCreateRoleWithName(roleName, client.guild);
    expect(client.guild.roles.create).toHaveBeenCalledTimes(1);
    expect(client.guild.roles.cache.size).toBe(1);
  });

  test("Duplicated role cannot be created", async () => {
    const roleName = "test";
    await findOrCreateRoleWithName(roleName, client.guild);
    await findOrCreateRoleWithName(roleName, client.guild);
    expect(client.guild.roles.cache.size).toBe(1);
    expect(client.guild.roles.create).toHaveBeenCalledTimes(0);
  });

  test("dont find invalid channel with name and type", () => {
    const channelFound = findChannelWithNameAndType("guide", "GUILD_TEXT", client.guild);
    expect(channelFound).toBeUndefined();
  });

  test("find valid channel with name and type", () => {
    const channelObject = { name: "guide", options: { type: "GUILD_TEXT" } };
    client.guild.channels.create(channelObject.name, channelObject.options);
    const channelFound = findChannelWithNameAndType("guide", "GUILD_TEXT", client.guild);
    const result = { name: "guide", type: "GUILD_TEXT" };
    expect(channelFound).toMatchObject(result);
  });

  test("find valid channel with id", () => {
    const channel = { name: "guide", type: "GUILD_TEXT" };
    const channelFound = findChannelWithId(1, client.guild);
    expect(channelFound).toMatchObject(channel);
  });

  test("creating guide invitation call createInvite", async () => {
    const msg = { pin: jest.fn() };
    const invite = { code: 1 };
    const guide = { name: "guide", type: "GUILD_TEXT", createInvite: jest.fn(() => invite), send: jest.fn(() => msg) };
    client.guild.channels.cache = [guide];
    await createInvitation(client.guild, "guide");
    expect(guide.createInvite).toHaveBeenCalledTimes(1);
    expect(msg.pin).toHaveBeenCalledTimes(1);
    client.guild.channels.cache = [];
  });

  test("creating invitation not guide", async () => {
    const msg = { pin: jest.fn() };
    const invite = { code: 1 };
    const guide = { name: "guide", type: "GUILD_TEXT", createInvite: jest.fn(() => invite), send: jest.fn(() => msg) };
    const testAnnouncement = { name: "test_announcement", type: "GUILD_TEXT", send: jest.fn(() => msg) };
    client.guild.channels.cache = [guide, testAnnouncement];
    await createInvitation(client.guild, "test");
    expect(guide.createInvite).toHaveBeenCalledTimes(0);
    expect(msg.pin).toHaveBeenCalledTimes(1);
    client.guild.channels.cache = [];
  });

  test("find public category", () => {
    const courseString = "test";
    const pubCategoryName = "📚 test";
    const pubChan = { name: pubCategoryName, type: "GUILD_CATEGORY" };
    client.guild.channels.cache = [pubChan];

    const result = findCategoryWithCourseName(courseString, client.guild);
    expect(result.name).toBe(pubCategoryName);
    client.guild.channels.cache = [];
  });

  test("find private category", () => {
    const courseString = "test";
    const privCategoryName = "👻 test";
    const privChan = { name: privCategoryName, type: "GUILD_CATEGORY" };
    client.guild.channels.cache = [privChan];

    const result = findCategoryWithCourseName(courseString, client.guild);
    expect(result.name).toBe(privCategoryName);
    client.guild.channels.cache = [];
  });

  test("create new group", async () => {
    const courseCode = "tkt101";
    const courseFullName = "test course";
    const courseString = "test";
    await createCourseToDatabase(courseCode, courseFullName, courseString, Course);
    // expect(Course.create).toHaveBeenCalledTimes(1);
    expect(Course.create).toHaveBeenCalledWith({ code: courseCode, fullName: courseFullName, name: courseString, private: false });
  });

  test("remove group - if no group dont destroy", async () => {
    const courseString = "test";
    await removeCourseFromDb(courseString, Course);
    expect(Course.findOne).toHaveBeenCalledTimes(1);
    expect(Course.destroy).toHaveBeenCalledTimes(0);
  });

  test("remove group - if group then destroy", async () => {
    const courseString = "test";
    await removeCourseFromDb(courseString, Course);
    expect(Course.findOne).toHaveBeenCalledTimes(1);
    expect(Course.destroy).toHaveBeenCalledTimes(1);
  });

  test("change ms to dorrect mm:ss format", () => {
    const time = "5:05";
    const result = msToMinutesAndSeconds(305000);
    expect(time).toMatch(result);
  });

  test("create a new channel if it does not exist", async () => {
    client.guild.channels.init();
    const channelObject = { name: "test", options: { type: "GUILD_TEXT" } };
    const guild = client.guild;
    await findOrCreateChannel(channelObject, guild);
    expect(guild.channels.create).toHaveBeenCalledTimes(1);
    expect(guild.channels.create).toHaveBeenCalledWith(channelObject.name, channelObject.options);
  });

  test("Dont create a new channel if exists", async () => {
    const channelObject = { name: "test", options: { type: "GUILD_TEXT" } };
    const guild = client.guild;
    await findOrCreateChannel(channelObject, guild);
    expect(guild.channels.create).toHaveBeenCalledTimes(0);
  });

  test("trimmer returs correct string public", async () => {
    const category = "test";
    const privateCategoryName = "📚 test";
    const channel = { name: privateCategoryName };
    const result = getCourseNameFromCategory(channel);
    expect(result).toBe(category);
  });

  test("trimmer returs correct string private", async () => {
    const category = "test";
    const privateCategoryName = "🔒 test";
    const channel = { name: privateCategoryName };
    const result = getCourseNameFromCategory(channel);
    expect(result).toBe(category);
  });

  test("Get workshops info returns proper info for course that exists", async () => {
    axios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: data,
      }),
    );
    let returnedValue = "";
    returnedValue = returnedValue.concat(`**Monday, November 29, 2021**
      Between: 14:00 - 16:00
      Location: BK107
      Instructor: Kalle Ilves
      \n`);
    returnedValue = returnedValue.concat(`**Wednesday, December 1, 2021**
      Between: 14:00 - 16:00
      Location: BK107
      Instructor: Markus Kaihola
      \n`);
    returnedValue = returnedValue.concat(`**Thursday, December 2, 2021**
      Between: 14:00 - 16:00
      Location: Remote
      Instructor: Matti Luukkainen
      Description: Ohjaus järjestetään zoomissa\n`);

    const result = await getWorkshopInfo("TKT-101");
    expect(result).toBe(returnedValue);
  });

  test("Get workshops info returns proper info for course that doesn't exist", async () => {
    axios.get.mockImplementationOnce(() =>
      Promise.resolve({
        data: [],
      }),
    );

    const result = await getWorkshopInfo("TKT-101");
    expect(result).toBe("No workshops for this course. Please contact the course admin.");
  });
});
