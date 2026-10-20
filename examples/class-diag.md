# Class Diagram Edge Cases

Thirty large `classDiagram` fixtures that stress the vendored renderer across
layout, routing, and vocabulary edge cases. Scroll to compare; `t` cycles the
theme and `q` quits.

## 1. Deep single-inheritance chain

```mermaid
classDiagram
  direction TB
  class Entity {
    +int id
    +touch() void
  }
  class Auditable {
    <<abstract>>
    +String actor
    +audit() void
  }
  class Party {
    +String name
    +rename(value) void
  }
  class Person {
    +Date born
  }
  class Employee {
    +String title
    +promote() void
  }
  class Manager {
    +int reports
    +approve(task) void
  }
  Entity <|-- Auditable
  Auditable <|-- Party
  Party <|-- Person
  Person <|-- Employee
  Employee <|-- Manager
  Person --> Entity : identifies
  Party o-- Entity : groups
```

## 2. Wide fan-out

```mermaid
classDiagram
  class Expr {
    <<abstract>>
    +String label
    +eval() double
  }
  class Add {
    +eval() double
  }
  class Sub {
    +eval() double
  }
  class Mul {
    +eval() double
  }
  class Div {
    +eval() double
  }
  class Pow {
    +eval() double
  }
  class Mod {
    +eval() double
  }
  class Neg {
    +eval() double
  }
  class Abs {
    +eval() double
  }
  Expr <|-- Add
  Expr <|-- Sub
  Expr <|-- Mul
  Expr <|-- Div
  Expr <|-- Pow
  Expr <|-- Mod
  Expr <|-- Neg
  Expr <|-- Abs
```

## 3. Every relationship kind

```mermaid
classDiagram
  class Base {
    +int id
  }
  class Derived {
    +String extra
  }
  class Contract {
    <<interface>>
    +run() void
  }
  class Engine {
    +start() void
  }
  class Wheel {
    +int size
  }
  class Fleet {
    +String name
  }
  class Report {
    +String path
  }
  class Api {
    +get() Response
  }
  Base <|-- Derived : inherits
  Derived *-- Engine : owns
  Fleet o-- Wheel : holds
  Api --> Report : returns
  Api ..> Engine : uses
  Contract <|.. Derived : realizes
  Wheel -- Engine : links
```

## 4. Diamond inheritance

```mermaid
classDiagram
  class Device {
    +String serial
    +power() void
  }
  class Networked {
    +String address
    +send() void
  }
  class Powered {
    +int watts
    +draw() int
  }
  class Router {
    +route() void
  }
  class Firewall {
    +filter() bool
  }
  class Gateway {
    +forward() void
  }
  class Cluster {
    +String region
  }
  Device <|-- Networked
  Device <|-- Powered
  Networked <|-- Router
  Powered <|-- Firewall
  Router <|-- Gateway
  Firewall <|-- Gateway
  Cluster o-- Gateway : hosts
  Cluster o-- Router : hosts
```

## 5. Composition tree

```mermaid
classDiagram
  class Document {
    +String title
  }
  class Chapter {
    +int order
  }
  class Section {
    +String heading
  }
  class Paragraph {
    +String text
  }
  class Figure {
    +String caption
  }
  class Table {
    +int rows
  }
  class Footnote {
    +String note
  }
  Document *-- Chapter : contains
  Chapter *-- Section : contains
  Section *-- Paragraph : contains
  Section *-- Figure : contains
  Section *-- Table : contains
  Paragraph *-- Footnote : cites
  Figure --> Footnote : references
```

## 6. Aggregation network

```mermaid
classDiagram
  class Library {
    +String name
  }
  class Shelf {
    +int index
  }
  class Book {
    +String isbn
  }
  class Author {
    +String name
  }
  class Publisher {
    +String city
  }
  class Reader {
    +String card
  }
  class Loan {
    +Date due
  }
  Library o-- Shelf : holds
  Shelf o-- Book : stores
  Author o-- Book : writes
  Publisher o-- Book : prints
  Reader o-- Loan : takes
  Book o-- Loan : lent
  Library o-- Reader : serves
```

## 7. Layered architecture with long edges

```mermaid
classDiagram
  direction TB
  class Ui {
    +render() void
  }
  class Controller {
    +handle() void
  }
  class Service {
    +execute() void
  }
  class Repository {
    +find() Data
  }
  class Cache {
    +get() Data
  }
  class Database {
    +query() Row
  }
  class Logger {
    +log() void
  }
  class Metrics {
    +count() void
  }
  class Config {
    +get() string
  }
  Ui --> Controller : routes
  Controller --> Service : calls
  Service --> Repository : reads
  Repository --> Cache : checks
  Repository --> Database : loads
  Ui ..> Logger : logs
  Service ..> Metrics : reports
  Controller ..> Config : reads
  Ui ..> Database : bypass
  Cache ..> Database : fills
```

## 8. Dense mesh

```mermaid
classDiagram
  class Alpha {
    +int a
  }
  class Beta {
    +int b
  }
  class Gamma {
    +int c
  }
  class Delta {
    +int d
  }
  class Epsilon {
    +int e
  }
  Alpha --> Beta
  Alpha --> Gamma
  Alpha --> Delta
  Beta --> Gamma
  Beta --> Epsilon
  Gamma --> Delta
  Gamma --> Epsilon
  Delta --> Alpha
  Delta --> Epsilon
  Epsilon --> Alpha
  Epsilon --> Beta
```

## 9. Direction LR

```mermaid
classDiagram
  direction LR
  class Client {
    +request() void
  }
  class Broker {
    +dispatch() void
  }
  class Worker {
    +run() void
  }
  class Queue {
    +push() void
  }
  class Store {
    +save() void
  }
  Client --> Broker : sends
  Broker --> Queue : enqueues
  Queue --> Worker : delivers
  Worker --> Store : persists
  Worker ..> Broker : acks
  Broker ..> Store : audits
```

## 10. Direction RL

```mermaid
classDiagram
  direction RL
  class Ingress {
    +accept() void
  }
  class Router {
    +match() Route
  }
  class Handler {
    +serve() void
  }
  class Middleware {
    +apply() void
  }
  class Logger {
    +write() void
  }
  Ingress --> Router : forwards
  Router --> Handler : invokes
  Handler --> Middleware : chains
  Handler ..> Logger : records
  Router ..> Handler : retries
```

## 11. Direction BT

```mermaid
classDiagram
  direction BT
  class Wallet {
    +String owner
  }
  class Payment {
    <<abstract>>
    +amount() double
  }
  class Card {
    +String last4
  }
  class Cash {
    +double tendered
  }
  class Transfer {
    +String iban
  }
  class Receipt {
    +String code
  }
  Wallet "1" o-- "0..*" Payment : funds
  Payment <|-- Card
  Payment <|-- Cash
  Payment <|-- Transfer
  Payment --> Receipt : issues
```

## 12. Bidirectional associations

```mermaid
classDiagram
  class User {
    +String email
  }
  class Team {
    +String name
  }
  class Project {
    +String title
  }
  class Ticket {
    +int number
  }
  class Comment {
    +String body
  }
  User --> Team : joins
  Team --> User : has
  User --> Project : owns
  Project --> User : contacts
  Project --> Ticket : tracks
  Ticket --> Project : belongs
  Ticket --> Comment : holds
  Comment --> Ticket : replies
  User <-- Comment : authors
```

## 13. Self loops and cycles

```mermaid
classDiagram
  class Step {
    +String name
    +next() Step
  }
  class Pipeline {
    +run() void
  }
  class StageA {
    +int a
  }
  class StageB {
    +int b
  }
  class StageC {
    +int c
  }
  Pipeline *-- StageA
  StageA --> StageB
  StageB --> StageC
  StageC --> StageA
  Step --> Step : recurses
  Pipeline --> Step : schedules
  StageB ..> Pipeline : reports
```

## 14. Disconnected clusters

```mermaid
classDiagram
  class Invoice {
    +String number
  }
  class Line {
    +int qty
  }
  class Tax {
    +double rate
  }
  class Sensor {
    +int pin
  }
  class Reading {
    +double value
  }
  class Gateway {
    +String host
  }
  class Cache {
    +int size
  }
  class Session {
    +String token
  }
  Invoice *-- Line
  Invoice o-- Tax
  Sensor --> Reading
  Reading --> Gateway
  Gateway *-- Cache
  Cache o-- Session
```

## 15. Corridor routing stress

```mermaid
classDiagram
  direction TB
  class A {
    +int a
  }
  class B {
    +int b
  }
  class C {
    +int c
  }
  class D {
    +int d
  }
  class E {
    +int e
  }
  class F {
    +int f
  }
  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  A ..> D : skips
  A ..> E : skips
  B ..> F : skips
  C ..> F : skips
  F --> A : loops back
```

## 16. Heavy labels and multiplicities

```mermaid
classDiagram
  class Customer {
    +String name
  }
  class Order {
    +String code
  }
  class Item {
    +String sku
  }
  class Address {
    +String zip
  }
  class Payment {
    +String method
  }
  class Coupon {
    +String code
  }
  Customer "1" --> "0..*" Order : places
  Order "1" *-- "1..*" Item : contains
  Customer "1" o-- "0..1" Address : ships to
  Order "1" --> "1" Payment : settles
  Order "0..*" --> "0..1" Coupon : applies
  Item "0..*" --> "1" Coupon : discounts
```

## 17. Stereotype variety

```mermaid
classDiagram
  class Shape {
    <<interface>>
    +area() double
  }
  class Circle {
    <<class>>
    +double radius
  }
  class Color {
    <<enumeration>>
    +RED
    +GREEN
    +BLUE
  }
  class Renderer {
    <<service>>
    +draw() void
  }
  class ShapeFactory {
    <<abstract>>
    +create() Shape
  }
  class Registry {
    <<singleton>>
    +instance() Registry
  }
  Shape <|-- Circle
  ShapeFactory ..> Shape : builds
  Renderer --> Shape : paints
  Circle --> Color : uses
  Registry o-- ShapeFactory : tracks
```

## 18. Generic and collection members

```mermaid
classDiagram
  class Repository {
    <<interface>>
    +List<Entity> all()
    +Optional<Entity> find(Id) Optional
  }
  class Cache {
    +Map<String, Entity> entries
    +Set<Id> keys
  }
  class Mapper {
    +Entity toDomain(Row) Entity
    +Row toRow(Entity) Row
  }
  class Page {
    +List<Entity> content
    +int total
  }
  class Query {
    +Map<String, Object> params
  }
  class Result {
    +List<Row> rows
  }
  Repository <|.. Cache : implements
  Cache --> Mapper : uses
  Repository --> Page : returns
  Query --> Result : yields
  Mapper --> Result : reads
```

## 19. Quoted and special class names

```mermaid
classDiagram
  class "Order Service" {
    +place() void
  }
  class "Order Repository" {
    +save() void
  }
  class order_events {
    +String kind
  }
  class "order.line" {
    +int qty
  }
  class audit~v2 {
    +String actor
  }
  "Order Service" --> "Order Repository" : writes
  "Order Repository" --> order_events : emits
  order_events --> "order.line" : expands
  "order.line" --> audit~v2 : records
  audit~v2 --> "Order Service" : notifies
```

## 20. Cyclic dependencies

```mermaid
classDiagram
  class ModuleA {
    +start() void
  }
  class ModuleB {
    +start() void
  }
  class ModuleC {
    +start() void
  }
  class ModuleD {
    +start() void
  }
  class ModuleE {
    +start() void
  }
  class Bootstrap {
    +init() void
  }
  ModuleA ..> ModuleB : uses
  ModuleB ..> ModuleC : uses
  ModuleC ..> ModuleD : uses
  ModuleD ..> ModuleE : uses
  ModuleE ..> ModuleA : uses
  Bootstrap ..> ModuleA : loads
  ModuleC ..> Bootstrap : calls
```

## 21. Layered with cross links

```mermaid
classDiagram
  direction TB
  class View {
    +paint() void
  }
  class ViewModel {
    +bind() void
  }
  class Model {
    +load() void
  }
  class Store {
    +get() Data
  }
  class Network {
    +fetch() Data
  }
  class Disk {
    +read() Data
  }
  class Telemetry {
    +emit() void
  }
  View --> ViewModel : observes
  ViewModel --> Model : reads
  Model --> Store : queries
  Store --> Network : refreshes
  Store --> Disk : caches
  View ..> Telemetry : tracks
  Network ..> Telemetry : tracks
  Disk ..> Telemetry : tracks
  ViewModel ..> Disk : warms
```

## 22. Branching tree

```mermaid
classDiagram
  class Root {
    +String id
  }
  class Left {
    +int l
  }
  class Middle {
    +int m
  }
  class Right {
    +int r
  }
  class LeftA {
    +int la
  }
  class LeftB {
    +int lb
  }
  class RightA {
    +int ra
  }
  class RightB {
    +int rb
  }
  class Leaf {
    +int v
  }
  Root *-- Left
  Root *-- Middle
  Root *-- Right
  Left *-- LeftA
  Left *-- LeftB
  Right *-- RightA
  Right *-- RightB
  LeftB --> Leaf : carries
  RightB --> Leaf : carries
  Middle --> Leaf : carries
```

## 23. Bipartite publishers and subscribers

```mermaid
classDiagram
  class PublisherA {
    +publish() void
  }
  class PublisherB {
    +publish() void
  }
  class PublisherC {
    +publish() void
  }
  class SubscriberX {
    +onEvent() void
  }
  class SubscriberY {
    +onEvent() void
  }
  class SubscriberZ {
    +onEvent() void
  }
  class Bus {
    +route() void
  }
  PublisherA --> Bus
  PublisherB --> Bus
  PublisherC --> Bus
  Bus --> SubscriberX
  Bus --> SubscriberY
  Bus --> SubscriberZ
  PublisherA ..> SubscriberZ : direct
  PublisherC ..> SubscriberX : direct
```

## 24. Chain with cross edges

```mermaid
classDiagram
  class L1 {
    +int v
  }
  class L2 {
    +int v
  }
  class L3 {
    +int v
  }
  class L4 {
    +int v
  }
  class L5 {
    +int v
  }
  class L6 {
    +int v
  }
  L1 --> L2
  L2 --> L3
  L3 --> L4
  L4 --> L5
  L5 --> L6
  L1 ..> L3 : skip
  L2 ..> L5 : skip
  L3 ..> L6 : skip
  L6 --> L1 : back
  L4 --> L2 : cross
```

## 25. Realization heavy

```mermaid
classDiagram
  class Serializable {
    <<interface>>
    +serialize() string
  }
  class Comparable {
    <<interface>>
    +compare(other) int
  }
  class Cloneable {
    <<interface>>
    +clone() Object
  }
  class Entity {
    +int id
  }
  class User {
    +String name
  }
  class Account {
    +double balance
  }
  Serializable <|.. Entity : implements
  Comparable <|.. User : implements
  Cloneable <|.. User : implements
  Serializable <|.. Account : implements
  Cloneable <|.. Account : implements
  Entity <|-- User
  Entity <|-- Account
```

## 26. Composition heavy

```mermaid
classDiagram
  class App {
    +run() void
  }
  class Window {
    +show() void
  }
  class Toolbar {
    +draw() void
  }
  class Canvas {
    +clear() void
  }
  class StatusBar {
    +set() void
  }
  class Button {
    +click() void
  }
  class Icon {
    +String path
  }
  App *-- Window
  Window *-- Toolbar
  Window *-- Canvas
  Window *-- StatusBar
  Toolbar *-- Button
  Button *-- Icon
  Canvas *-- Grid : draws
  Grid *-- Cell : holds
  class Grid {
    +int cols
  }
  class Cell {
    +String glyph
  }
```

## 27. Association heavy with multiplicities

```mermaid
classDiagram
  class Course {
    +String code
  }
  class Student {
    +String id
  }
  class Teacher {
    +String name
  }
  class Room {
    +String label
  }
  class Exam {
    +Date date
  }
  class Grade {
    +double value
  }
  Course "1" --> "0..*" Student : enrolls
  Teacher "1" --> "1..*" Course : teaches
  Course "1" --> "0..1" Room : uses
  Course "1" --> "1..*" Exam : schedules
  Student "1" --> "0..*" Exam : takes
  Exam "1" --> "0..*" Grade : yields
  Grade "0..*" --> "1" Student : belongs
```

## 28. Accessibility and comments

```mermaid
classDiagram
  accTitle: Commerce model
  accDescr: Orders, items and payments
  %% domain core
  class Order {
    +String code
    +total() double
  }
  class Item {
    +String sku
    +int qty
  }
  class Payment {
    +double value
    +capture() void
  }
  class Customer {
    +String name
  }
  class Address {
    +String zip
  }
  class Shipment {
    +String tracking
  }
  %% relationships
  Customer "1" --> "0..*" Order : places
  Order "1" *-- "1..*" Item : contains
  Order "1" --> "1" Payment : settles
  Order "1" --> "0..1" Shipment : ships
  Customer "1" o-- "0..1" Address : bills
  Item "0..*" --> "1" Payment : billed
```

## 29. Very wide sibling rank

```mermaid
classDiagram
  class Hub {
    +route() void
  }
  class N1 {
    +int v
  }
  class N2 {
    +int v
  }
  class N3 {
    +int v
  }
  class N4 {
    +int v
  }
  class N5 {
    +int v
  }
  class N6 {
    +int v
  }
  class N7 {
    +int v
  }
  class N8 {
    +int v
  }
  class N9 {
    +int v
  }
  class N10 {
    +int v
  }
  Hub --> N1
  Hub --> N2
  Hub --> N3
  Hub --> N4
  Hub --> N5
  Hub --> N6
  Hub --> N7
  Hub --> N8
  Hub --> N9
  Hub --> N10
```

## 30. Very tall rank chain

```mermaid
classDiagram
  direction TB
  class R1 {
    +int v
  }
  class R2 {
    +int v
  }
  class R3 {
    +int v
  }
  class R4 {
    +int v
  }
  class R5 {
    +int v
  }
  class R6 {
    +int v
  }
  class R7 {
    +int v
  }
  class R8 {
    +int v
  }
  class Side1 {
    +int s
  }
  class Side2 {
    +int s
  }
  R1 --> R2
  R2 --> R3
  R3 --> R4
  R4 --> R5
  R5 --> R6
  R6 --> R7
  R7 --> R8
  Side1 --> R4
  Side2 --> R6
  R8 ..> Side1 : returns
```
