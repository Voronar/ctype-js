#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <cmath>

#include <QMainWindow>
#include <QTimer>

#include <QtWebSockets/QWebSocketServer>
#include <QtWebSockets/QWebSocket>

#include <QWebEngineView>

#pragma pack(push, 1)
 struct SubStructure2
 {
   int sint;
 };
 struct SubStructure1
 {
   int sint;
   SubStructure2 s2;
 };
 struct UnsignedArrays
 {
   unsigned char  uchar [2]; //UInt8Array
   unsigned short ushort[2]; //UInt16Array
   unsigned int   uint  [2]; //UInt32Array
 };
 struct SignedArrays
 {
   char   schar  [2]; //Int8Array
   short  sshort [2]; //Int16Array
   int    sint   [2]; //Int32Array
   float  sfloat [2]; //Float32Array
   double sdouble[2]; //Float64Array
 };
 struct Structure
 {
   UnsignedArrays ua[2];
   SignedArrays   sa;
   SubStructure1  s1;
 };
 #pragma pack(pop)


namespace Ui {
  class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

  public:
    explicit MainWindow(QWidget *parent = 0);
    ~MainWindow();

  private slots:
    void newConnection();
    void connectionClosed();

    void processTextMessage(QString message);
    void processBinaryMessage(QByteArray message);
    void socketDisconnected();

    void on_socketButton_clicked();

    void on_bindButton_clicked();

    void socketTimerTick();
    void bindTimerTick();

    void on_socketStopButton_clicked();

    void on_bindStopButton_clicked();

  private:
    Ui::MainWindow *ui;

    QWebSocketServer*  wsServer;
    QList<QWebSocket*> clients;
    int port;

    QWebEngineView *view;

    QTimer* socketTimer;
    QTimer* bindTimer;

    void sendToJS();
    void bindJS();
};

#endif // MAINWINDOW_H
