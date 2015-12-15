#-------------------------------------------------
#
# Project created by QtCreator 2015-12-03T11:04:40
#
#-------------------------------------------------

QT       += core gui websockets webenginewidgets

greaterThan(QT_MAJOR_VERSION, 4): QT += widgets

TARGET = web_socket_test
TEMPLATE = app


SOURCES += main.cpp\
        mainwindow.cpp

HEADERS  += mainwindow.h

FORMS    += mainwindow.ui

QMAKE_CXXFLAGS += -std=c++11
